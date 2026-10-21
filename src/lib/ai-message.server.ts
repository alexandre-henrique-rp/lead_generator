// ==========================================================================
// ai-message.server.ts — geração de 1ª mensagem WhatsApp (server-only).
// NUNCA importar este arquivo de rotas/componentes (import protection).
// O client chama via `gerarMensagemServerFn` definida em `./ai-message`.
// ==========================================================================

import type {
	MensagemGerada,
	OportunidadeTi,
	PrioridadeOportunidade,
} from "./ai-message";
import type {
	CanalMensagem,
	LeadInput,
	PesquisaEmpresaInput,
} from "./prompts/cold-outreach";
import {
	buildColdOutreachPrompt,
	buildMelhoriaDeMensagemPrompt,
} from "./prompts/cold-outreach";

/**
 * Endpoint REST do Gemini (generateContent).
 * Doc: https://ai.google.dev/gemini-api/docs/text-generation
 * Formato: query string ?key=  também é aceito, mas usamos header.
 */
const GEMINI_ENDPOINT =
	"https://generativelanguage.googleapis.com/v1beta/models";

/** Modelo do tier gratuito — a cadeia automática NUNCA sai dele sem o gate pago. */
const MODELO_GRATUITO = "gemini-3.5-flash-lite";

/** Cadeia de fallback PAGA (do mais novo pro mais antigo) — só com gate aberto. */
const MODEL_FALLBACK_CHAIN = [
	"gemini-3.5-flash-lite",
	"gemini-3.8-flash",
	"gemini-2.5-flash",
] as const;

/**
 * Monta a cadeia de modelos a tentar, respeitando o gate de custo.
 *
 * - Sem gate (`permitirPago=false`): a cadeia automática fica SÓ no
 *   modelo gratuito — custo zero garantido. O tier gratuito do AI
 *   Studio não fatura, mas tem limite de RPM/RPD.
 * - Com gate (`permitirPago=true`): cai nos modelos pagos da cadeia
 *   quando o gratuito falhar (404/503) — a chamada é faturada.
 * - Modelo explícito digitado pelo Operador (`modeloConfig`) é SEMPRE
 *   o primeiro da lista — decisão dele, o gate protege só o fallback
 *   automático.
 */
export function montarCadeiaModelos(
	modeloConfig: string | null | undefined,
	permitirPago: boolean,
): string[] {
	const config = (modeloConfig ?? "").trim();
	if (config) {
		return permitirPago
			? [config, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== config)]
			: [config];
	}
	return permitirPago ? [...MODEL_FALLBACK_CHAIN] : [MODELO_GRATUITO];
}

interface GeminiResponse {
	candidates?: Array<{
		content?: { parts?: Array<{ text?: string }> };
		finishReason?: string;
	}>;
	usageMetadata?: {
		promptTokenCount?: number;
		candidatesTokenCount?: number;
		totalTokenCount?: number;
	};
	error?: { code?: number; message?: string; status?: string };
}

/**
 * Gera análise + mensagem para um lead via Gemini.
 *
 * Sem fallback de stub — se Gemini não responder (chave inválida, modelo
 * indisponível, sem rede), lança Error. A UI mostra o erro e o Operador
 * fica sem texto. Isso garante que NUNCA aparece texto falso/fabricado
 * como se fosse da API.
 *
 * Retry: 503/UNAVAILABLE é transitório. Tenta 3x com backoff (1s, 2s, 4s).
 * Fallback de modelo: se o modelo padrão der 404 ou 503, tenta o próximo
 * da cadeia (gemini-3.5-flash-lite → 3.8-flash → 2.5-flash).
 */
export async function gerarMensagemParaLead(
	leadUuid: string,
	opcoes?: { mensagemAtual?: string; canal?: CanalMensagem },
): Promise<MensagemGerada> {
	const { prisma } = await import("#/db");

	const canal: CanalMensagem = opcoes?.canal ?? "WHATSAPP";

	const lead = await prisma.lead.findUnique({
		where: { uuid: leadUuid },
		select: {
			nome: true,
			razaoSocial: true,
			cidade: true,
			uf: true,
			etapaFunil: true,
			observacoes: true,
			cnaeFiscalDescricao: true,
			porte: true,
			dataInicioAtividade: true,
			capitalSocialCentavos: true,
			descricaoSituacaoCadastral: true,
			website: true,
			pesquisa: {
				select: {
					resumo: true,
					site: true,
					emails: true,
					telefones: true,
					whatsapp: true,
					decisores: true,
					pesquisadoEm: true,
					fonte: true,
				},
			},
		},
	});

	if (!lead) {
		throw new Error(`Lead ${leadUuid} não encontrado.`);
	}

	// Pesquisa web persistida (PesquisaLead) — vira o nível topo da
	// escada de personalização no prompt. Sem registro = prompt sem ela.
	const leadInput: LeadInput = {
		nome: lead.nome,
		razaoSocial: lead.razaoSocial,
		cidade: lead.cidade,
		uf: lead.uf,
		etapaFunil: lead.etapaFunil,
		observacoes: lead.observacoes,
		cnaeFiscalDescricao: lead.cnaeFiscalDescricao,
		porte: lead.porte,
		dataInicioAtividade: lead.dataInicioAtividade,
		capitalSocialCentavos: lead.capitalSocialCentavos,
		descricaoSituacaoCadastral: lead.descricaoSituacaoCadastral,
		website: lead.website,
		pesquisa: mapearPesquisa(lead.pesquisa),
	};

	// Chave efetiva: banco (Configurações → Integrações) > env.
	const { getIntegracaoCredenciais, resolverChave } = await import(
		"./integracao.server"
	);
	const creds = await getIntegracaoCredenciais();
	const apiKey = resolverChave(creds.geminiApiKey, process.env.GEMINI_API_KEY);
	const modeloConfig = resolverChave(
		creds.geminiModelo,
		process.env.GEMINI_MODEL,
	);

	if (!apiKey) {
		throw new Error(
			"Chave do Gemini não configurada. Cadastre em Configurações → Integrações.",
		);
	}

	// Gate de custo: sem o toggle (Configurações → Integrações) nem o env
	// GEMINI_PAID_FALLBACK=true, a cadeia automática fica só no modelo
	// gratuito — o tier free do AI Studio nunca fatura.
	const permitirPago =
		creds.geminiPermitirPago || process.env.GEMINI_PAID_FALLBACK === "true";

	// Cadeia de modelos a tentar (config do .env/banco primeiro, depois fallback)
	const modelosParaTentar = montarCadeiaModelos(modeloConfig, permitirPago);

	// Modo melhoria: se o Operador mandou a mensagem atual (botão Regenerar),
	// o Gemini itera em cima dela em vez de gerar do zero.
	const mensagemAtual = opcoes?.mensagemAtual?.trim();
	const prompt = mensagemAtual
		? `${buildColdOutreachPrompt(leadInput, canal)}\n\n${buildMelhoriaDeMensagemPrompt(mensagemAtual, canal)}`
		: buildColdOutreachPrompt(leadInput, canal);
	console.log(
		`[ai-message] lead=${leadUuid} canal=${canal} modo=${mensagemAtual ? "MELHORIA" : "NOVO"} pago=${permitirPago} key=${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (${apiKey.length} chars) modelos=[${modelosParaTentar.join(", ")}]`,
	);
	console.log(
		`[ai-message] prompt length=${prompt.length} chars / ~${Math.round(prompt.length / 4)} tokens`,
	);

	let lastError: Error | null = null;
	for (const modelo of modelosParaTentar) {
		try {
			const text = await chamarGeminiComRetry(apiKey, modelo, prompt, canal);
			const parsed = parseRespostaGemini(text);
			// Canal EMAIL exige assunto — sem ele o preview/copy não existe.
			const assunto = parsed.assunto?.trim();
			if (canal === "EMAIL" && !assunto) {
				throw new Error(
					'Gemini não retornou o campo "assunto" obrigatório do canal EMAIL',
				);
			}
			console.log(
				`[ai-message] ✅ resposta do Gemini (${modelo}): ${parsed.mensagem.length} chars, ${parsed.oportunidades.length} oportunidades`,
			);
			return {
				analise: parsed.analise,
				mensagem: parsed.mensagem,
				...(assunto ? { assunto } : {}),
				oportunidades: parsed.oportunidades,
				modelo,
				canal,
			};
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			console.error(
				`[ai-message] ❌ falhou com ${modelo}: ${lastError.message}`,
			);
			// Se for 404 (modelo não existe), tenta o próximo da cadeia.
			// Resposta incompleta (falta "assunto" no canal EMAIL) também —
			// talvez outro modelo da cadeia preencha o schema direito.
			// Outros erros (401, 400) param — não adianta tentar outro modelo com a mesma chave
			const modeloIndisponivel =
				lastError.message.includes("not found") ||
				lastError.message.includes("404");
			const respostaIncompleta = lastError.message.includes("assunto");
			if (!modeloIndisponivel && !respostaIncompleta) {
				throw lastError;
			}
		}
	}

	throw lastError ?? new Error("Gemini: nenhum modelo da cadeia respondeu");
}

// ==========================================================================
// Chamada Gemini com retry
// ==========================================================================

async function chamarGeminiComRetry(
	apiKey: string,
	modelo: string,
	prompt: string,
	canal: CanalMensagem,
): Promise<string> {
	const maxTentativas = 3;
	const delaysMs = [1000, 2000, 4000]; // backoff exponencial

	let lastError: Error | null = null;
	for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
		try {
			return await chamarGemini(apiKey, modelo, prompt, canal);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			const ehTransient =
				lastError.message.includes("UNAVAILABLE") ||
				lastError.message.includes("503") ||
				lastError.message.includes("timeout") ||
				lastError.message.includes("ECONNRESET");

			if (!ehTransient || tentativa === maxTentativas) {
				throw lastError;
			}

			const delay = delaysMs[tentativa - 1] ?? 1000;
			console.log(
				`[ai-message] retry ${tentativa + 1}/${maxTentativas} após ${delay}ms (${lastError.message})`,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	throw lastError ?? new Error("Gemini: retry esgotou");
}

async function chamarGemini(
	apiKey: string,
	model: string,
	prompt: string,
	canal: CanalMensagem,
): Promise<string> {
	const url = `${GEMINI_ENDPOINT}/${model}:generateContent`;
	const ehEmail = canal === "EMAIL";

	// Schema de saída: o canal EMAIL adiciona o campo "assunto" (obrigatório).
	// Cada campo tem `description` — no structured output isso vira restrição
	// semântica DURA, especialmente importante no modelo Lite.
	const propriedadesSaida: Record<string, unknown> = {
		analise: {
			type: "STRING",
			description:
				"Diagnóstico interno em 4-6 frases de PT-BR: tipo de empresa, ciclo de digitalização, gargalo mais provável, software que faria diferença real e o arquétipo escolhido (A/B/C/D) com o porquê.",
		},
		mensagem: {
			type: "STRING",
			description:
				"Mensagem de WhatsApp em PT-BR brasileiro, 6 blocos (saudação 'Fala, [nome]! Tudo bem?', contexto/dor com fato real do lead, posicionamento 'Sou o Alexandre, da King Dev, aqui da região...', valor em prosa SEM lista, CTA com pergunta aberta de 5 minutos 'por aqui', assinatura 'Abraço!'). SEM bullets, SEM markdown, SEM negrito, SEM emoji, SEM concorrentes citados. Cada bloco separado por quebra de linha em branco.",
		},
		oportunidades: {
			type: "ARRAY",
			description:
				"3 a 5 oportunidades de TI pra esse lead — no mínimo 1 PRINCIPAL (sempre software/automação/integração) e no mínimo 1 EXPANSAO. As 3 linhas de oferta da mensagem vêm DESSE mapa.",
			items: {
				type: "OBJECT",
				properties: {
					titulo: {
						type: "STRING",
						description:
							"Nome curto do serviço, uma frase, PT-BR sem jargão (ex.: 'Automação de pedido no WhatsApp').",
					},
					dor: {
						type: "STRING",
						description:
							"O problema do lead em palavras dele, uma frase (ex.: 'pedido se perde no zap pessoal do dono').",
					},
					servico: {
						type: "STRING",
						description:
							"O que a King Dev entrega pra resolver, uma frase concreta (ex.: 'bot + cardápio com link que manda a comanda formatada').",
					},
					ganho: {
						type: "STRING",
						description:
							"O resultado prático pro negócio, uma frase (ex.: 'fim do papel e do repetir o cardápio').",
					},
					prioridade: {
						type: "STRING",
						description:
							"Classificação: 'ENTRADA' (quebra gelo, baixo compromisso), 'PRINCIPAL' (maior impacto) ou 'EXPANSAO' (cresce depois da 1ª entrega).",
					},
				},
				required: ["titulo", "dor", "servico", "ganho", "prioridade"],
			},
		},
	};
	const requeridos = ["analise", "mensagem", "oportunidades"];
	if (ehEmail) {
		propriedadesSaida.assunto = {
			type: "STRING",
			description:
				"Assunto do email em PT-BR, até 60 caracteres, com curiosidade real (pergunta da dor do setor, fato da pesquisa ou gancho da cidade). SEM 'Olá', 'Novidade', CAPS LOCK ou emoji.",
		};
		requeridos.unshift("assunto");
	}

	const body = {
		contents: [{ parts: [{ text: prompt }] }],
		generationConfig: {
			temperature: 0.85,
			topK: 40,
			topP: 0.98,
			// EMAIL é um pouco mais longo (corpo + assunto) que o zap
			maxOutputTokens: ehEmail ? 2048 : 1536,
			responseMimeType: "application/json",
			responseSchema: {
				type: "OBJECT",
				properties: propriedadesSaida,
				required: requeridos,
			},
		},
	};

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-goog-api-key": apiKey,
		},
		body: JSON.stringify(body),
	});

	const data = (await res.json()) as GeminiResponse;

	if (!res.ok || data.error) {
		const msg = data.error?.message || `HTTP ${res.status}`;
		throw new Error(`Gemini API: ${msg}`);
	}

	const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!text) {
		throw new Error("Gemini retornou resposta vazia");
	}
	return text;
}

const PRIORIDADES_VALIDAS: readonly PrioridadeOportunidade[] = [
	"ENTRADA",
	"PRINCIPAL",
	"EXPANSAO",
];

function normalizarPrioridade(valor: unknown): PrioridadeOportunidade {
	if (typeof valor === "string") {
		const upper = valor.trim().toUpperCase();
		if (PRIORIDADES_VALIDAS.includes(upper as PrioridadeOportunidade)) {
			return upper as PrioridadeOportunidade;
		}
	}
	// Fora do enum não quebra a UI — cai em ENTRADA (menor ênfase)
	return "ENTRADA";
}

/**
 * Normaliza o array "oportunidades" vindo do Gemini de forma defensiva.
 * Itens incompletos ou malformados são descartados; se a lista vier
 * ausente/vazia, retorna [] (a UI apenas não exibe o bloco).
 */
export function normalizarOportunidades(raw: unknown): OportunidadeTi[] {
	if (!Array.isArray(raw)) {
		return [];
	}

	const oportunidades: OportunidadeTi[] = [];
	for (const item of raw) {
		if (typeof item !== "object" || item === null) {
			continue;
		}
		const obj = item as Record<string, unknown>;
		const titulo = typeof obj.titulo === "string" ? obj.titulo.trim() : "";
		const dor = typeof obj.dor === "string" ? obj.dor.trim() : "";
		const servico = typeof obj.servico === "string" ? obj.servico.trim() : "";
		const ganho = typeof obj.ganho === "string" ? obj.ganho.trim() : "";

		if (!titulo || !dor || !servico || !ganho) {
			continue;
		}

		oportunidades.push({
			titulo,
			dor,
			servico,
			ganho,
			prioridade: normalizarPrioridade(obj.prioridade),
		});
	}

	return oportunidades.slice(0, 5);
}

/**
 * Higienização pós-parse: remove resíduos de listas (bullets/marcadores
 * que escaparam do structured output) e colapsa 3+ quebras de linha.
 * É a garantia final — o schema já proíbe marcadores, isto é o safety net.
 */
export function higienizarTexto(valor: string): string {
	return valor
		.replace(/^[•▪◦\-–—*]\s+/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function parseRespostaGemini(raw: string): {
	analise: string;
	mensagem: string;
	assunto?: string;
	oportunidades: OportunidadeTi[];
} {
	// Gemini retorna JSON puro quando responseMimeType=application/json, mas
	// pode vir com ```json em volta se o modelo ignorar a config. Strip defensivo.
	let cleaned = raw
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```\s*$/i, "")
		.trim();

	console.log(
		`[parseRespostaGemini] raw length=${raw.length}, cleaned length=${cleaned.length}, startsWith=${cleaned.slice(0, 15)}`,
	);

	// Try to extract JSON if it's embedded in other text
	const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
	if (jsonMatch) {
		cleaned = jsonMatch[0];
		console.log(
			`[parseRespostaGemini] extracted JSON from text, new length=${cleaned.length}`,
		);
	}

	try {
		const parsed = JSON.parse(cleaned) as Record<string, unknown>;
		console.log(
			`[parseRespostaGemini] parsed types: analise=${typeof parsed.analise}, mensagem=${typeof parsed.mensagem}, oportunidades=${Array.isArray(parsed.oportunidades)}, keys=${Object.keys(parsed).join(",")}`,
		);

		// Try to be flexible about field names (e higieniza: sem bullets)
		const analise = higienizarTexto(
			typeof parsed.analise === "string"
				? parsed.analise
				: typeof parsed.analise_completa === "string"
					? parsed.analise_completa
					: typeof parsed.analysis === "string"
						? parsed.analysis
						: "",
		);
		const mensagem = higienizarTexto(
			typeof parsed.mensagem === "string"
				? parsed.mensagem
				: typeof parsed.mensagem_whatsapp === "string"
					? parsed.mensagem_whatsapp
					: typeof parsed.texto === "string"
						? parsed.texto
						: typeof parsed.message === "string"
							? parsed.message
							: typeof parsed.mensagem_para_cliente === "string"
								? parsed.mensagem_para_cliente
								: "",
		);

		if (analise && mensagem) {
			// Assunto é só do canal EMAIL — nomes flexíveis, vazio = ausente
			const brutoAssunto =
				typeof parsed.assunto === "string"
					? parsed.assunto
					: typeof parsed.assunto_email === "string"
						? parsed.assunto_email
						: typeof parsed.subject === "string"
							? parsed.subject
							: "";
			const assunto = higienizarTexto(brutoAssunto);
			return {
				analise,
				mensagem,
				...(assunto ? { assunto } : {}),
				oportunidades: normalizarOportunidades(parsed.oportunidades),
			};
		}
	} catch (e) {
		console.log(
			`[parseRespostaGemini] JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
		);
		// cai no throw
	}

	// Se o Gemini não retornou resposta JSON válida com os campos esperados, propaga erro
	// (a UI não mostra nada). Antes tinha fallback de mensagem genérica — removido.
	let debugInfo = cleaned.slice(0, 400);
	try {
		const p = JSON.parse(cleaned);
		debugInfo = JSON.stringify({
			analiseTipo: typeof p.analise,
			mensagemTipo: typeof p.mensagem,
			temAnalise: "analise" in p,
			temMensagem: "mensagem" in p,
			preview: cleaned.slice(0, 400),
		});
	} catch {}
	throw new Error(
		`Gemini retornou resposta em formato inesperado: ${debugInfo}`,
	);
}

// ==========================================================================
// PesquisaLead → PesquisaEmpresaInput (JSON-as-string defensivo)
// ==========================================================================

/** Linha do model PesquisaLead como o Prisma devolve (JSON em String). */
export interface PesquisaLinha {
	resumo: string;
	site: string | null;
	emails: string | null;
	telefones: string | null;
	whatsapp: string | null;
	decisores: string | null;
	pesquisadoEm: Date;
	fonte: string;
}

/** Parse defensivo de campo JSON-as-string — lixo/vazio vira []. */
function parseJsonArray(raw: string | null): unknown[] {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/**
 * Converte a linha persistida do PesquisaLead pro formato do prompt.
 * Retorna `null` quando não há pesquisa (prompt sai sem o bloco de dados).
 * Itens malformados são descartados — nunca derruba a geração.
 */
export function mapearPesquisa(
	linha: PesquisaLinha | null | undefined,
): PesquisaEmpresaInput | null {
	if (!linha) return null;

	const apenasStrings = (raw: string | null): string[] =>
		parseJsonArray(raw).filter(
			(item): item is string =>
				typeof item === "string" && item.trim().length > 0,
		);

	const decisores: Array<{ nome: string; cargo: string | null }> = [];
	for (const item of parseJsonArray(linha.decisores)) {
		if (typeof item !== "object" || item === null) continue;
		const obj = item as { nome?: unknown; cargo?: unknown };
		if (typeof obj.nome !== "string" || !obj.nome.trim()) continue;
		decisores.push({
			nome: obj.nome.trim(),
			cargo:
				typeof obj.cargo === "string" && obj.cargo.trim()
					? obj.cargo.trim()
					: null,
		});
	}

	return {
		resumo: linha.resumo,
		site: linha.site,
		emails: apenasStrings(linha.emails),
		telefones: apenasStrings(linha.telefones),
		whatsapp: linha.whatsapp,
		decisores,
		pesquisadoEm: linha.pesquisadoEm,
		fonte: linha.fonte,
	};
}
