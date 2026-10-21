// ==========================================================================
// research.server.ts — pesquisa sobre uma empresa (server-only).
// Cascade: Gemini + Google Search Grounding → Google Places → lead data.
// NUNCA importar este arquivo de rotas/componentes (import protection).
// O client chama via `pesquisarEmpresaServerFn` definida em `./research`.
//
// Preferência de formato da resposta do Gemini:
//   1. JSON mode (responseMimeType application/json) — parse estruturado,
//      sem regex frágil. Se o modelo/recuso não suportar junto do
//      googleSearch, cai pro fallback:
//   2. Formato de seções (===CONTATO=== primeiro, ===RESUMO=== depois) —
//      o CONTATO vem primeiro pra sobreviver a truncamento de tokens.
// ==========================================================================

import { getIntegracaoCredenciais, resolverChave } from "./integracao.server";
import { buscarEmpresaPlaces, formatarPlaceParaResumo } from "./places.server";
import type { LeadInputCompleto } from "./prompts/cold-outreach";
import {
	type ContatoHtml,
	extractContactsFromSite,
	parsearJsonGemini,
	parsearRespostaGemini,
	type RespostaPesquisaGemini,
} from "./research-contacts";

const GEMINI_ENDPOINT =
	"https://generativelanguage.googleapis.com/v1beta/models";

const MODEL_FALLBACK_CHAIN = [
	"gemini-3.5-flash-lite",
	"gemini-3.8-flash",
	"gemini-2.5-flash",
] as const;

type Fonte = "gemini-grounded" | "places" | "lead-data";

interface GroundingChunkWeb {
	web?: { uri?: string; title?: string };
}

interface GeminiPart {
	text?: string;
}

interface GeminiCandidate {
	content?: { parts?: GeminiPart[] };
	finishReason?: string;
	groundingMetadata?: {
		groundingChunks?: GroundingChunkWeb[];
		webSearchQueries?: string[];
	};
}

interface GeminiResponse {
	candidates?: GeminiCandidate[];
	usageMetadata?: {
		promptTokenCount?: number;
		candidatesTokenCount?: number;
		totalTokenCount?: number;
	};
	error?: { code?: number; message?: string; status?: string };
}

const VAZIO_CONTATO_HTML: ContatoHtml = {
	emails: [],
	telefones: [],
	whatsapp: null,
};

export interface EmpresaPesquisada {
	resumo: string;
	fontes: Array<{ uri: string; titulo: string }>;
	queriesUsadas: string[];
	modelo: string;
	/** De onde veio o resumo: gemini-grounded > places > lead-data */
	fonte: Fonte;
	/** Site oficial (URL completa, ou null) */
	site: string | null;
	/** Emails de contato comercial encontrados (validados) */
	emails: string[];
	/** Telefones comerciais formatados ((11) 99999-9999) */
	telefones: string[];
	/** WhatsApp em E.164 sem sinal (5511999999999), se encontrado */
	whatsapp: string | null;
	/** Decisores / sócios / diretoria com nome + cargo (se público) */
	decisores: Array<{ nome: string; cargo: string | null }>;
	/**
	 * Diagnóstico de cada tier tentado (mostra na UI pra Operador entender
	 * por que a pesquisa caiu num tier menos rico).
	 */
	tentativas: Array<{
		tier: "gemini-grounded" | "places" | "lead-data";
		ok: boolean;
		motivo?: string;
	}>;
}

/**
 * Pesquisa a empresa com cascade em 3 tiers:
 *  1. **Gemini + Google Search Grounding** (melhor qualidade, mas consome
 *     cota do Gemini free tier — quota 429 cai pro próximo)
 *  2. **Google Places API** (telefone, site, rating, endereço — não usa
 *     cota do Gemini, mais barato, mas menos rico)
 *  3. **Lead data fallback** (resumo genérico a partir do que já tem no
 *     banco — CNPJ, CNAE, porte, capital, observações existentes)
 *
 * Retorna o primeiro tier que funcionar. Throws se TODOS falharem.
 */
export async function pesquisarEmpresa(
	lead: LeadInputCompleto,
): Promise<EmpresaPesquisada> {
	console.log(`[research] lead=${lead.nome} — tentando cascade`);

	const tentativas: Array<{
		tier: "gemini-grounded" | "places" | "lead-data";
		ok: boolean;
		motivo?: string;
	}> = [];

	// TIER 1: Gemini + Google Search Grounding
	try {
		const { result, aviso } = await pesquisarGeminiGrounding(lead);
		tentativas.push({
			tier: "gemini-grounded",
			ok: true,
			...(aviso ? { motivo: aviso } : {}),
		});
		result.tentativas = tentativas;
		console.log(`[research] ✅ tier 1 (Gemini grounded) OK`);
		return result;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		const ehQuota =
			msg.includes("quota") ||
			msg.includes("RESOURCE_EXHAUSTED") ||
			msg.includes("429") ||
			msg.includes("rate");
		const motivo = ehQuota
			? "cota do Gemini free tier esgotada (reseta em ~24h ou faça upgrade em aistudio.google.com)"
			: msg;
		tentativas.push({ tier: "gemini-grounded", ok: false, motivo });
		console.log(
			`[research] tier 1 falhou (${ehQuota ? "quota" : "outro"}): ${msg} — tentando tier 2`,
		);
	}

	// TIER 2: Google Places API
	try {
		const result = await pesquisarPlaces(lead);
		if (result) {
			tentativas.push({ tier: "places", ok: true });
			result.tentativas = tentativas;
			console.log(`[research] ✅ tier 2 (Places) OK`);
			return result;
		}
		tentativas.push({
			tier: "places",
			ok: false,
			motivo: "Places não retornou resultado pra essa empresa",
		});
		console.log(`[research] tier 2 sem resultado — tentando tier 3`);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		tentativas.push({ tier: "places", ok: false, motivo: msg });
		console.log(`[research] tier 2 falhou: ${msg} — tentando tier 3`);
	}

	// TIER 3: Lead data fallback (sempre funciona se o lead existe)
	const result = gerarResumoLeadData(lead, tentativas);
	console.log(`[research] ✅ tier 3 (lead-data) OK`);
	return result;
}

// ==========================================================================
// TIER 1: Gemini + Google Search Grounding
// ==========================================================================

function ehErroDeQuota(msg: string): boolean {
	return (
		msg.includes("quota") ||
		msg.includes("RESOURCE_EXHAUSTED") ||
		msg.includes("429") ||
		msg.includes("rate")
	);
}

function ehErroTentavel(msg: string): boolean {
	return ehErroDeQuota(msg) || msg.includes("not found") || msg.includes("404");
}

/**
 * Resultado do tier 1 com um aviso opcional (ex: resposta truncada)
 * que vira `motivo` em tentativas e aparece no diagnóstico da UI.
 */
interface PesquisaGemini {
	result: EmpresaPesquisada;
	aviso?: string;
}

async function pesquisarGeminiGrounding(
	lead: LeadInputCompleto,
): Promise<PesquisaGemini> {
	// Chave efetiva: banco (Configurações → Integrações) > env.
	const creds = await getIntegracaoCredenciais();
	const apiKey = resolverChave(creds.geminiApiKey, process.env.GEMINI_API_KEY);
	if (!apiKey) {
		throw new Error(
			"Chave do Gemini não configurada. Cadastre em Configurações → Integrações.",
		);
	}

	const modeloConfig = resolverChave(
		creds.geminiModelo,
		process.env.GEMINI_MODEL,
	);
	const modelosParaTentar = modeloConfig
		? [modeloConfig, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== modeloConfig)]
		: [...MODEL_FALLBACK_CHAIN];

	const promptJson = buildResearchPromptJson(lead);
	const promptSecoes = buildResearchPromptSecoes(lead);

	let lastError: Error | null = null;
	for (const modelo of modelosParaTentar) {
		try {
			return await pesquisarComModelo(
				apiKey,
				modelo,
				promptJson,
				promptSecoes,
				lead,
			);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			// Quota / not found → tenta próximo modelo
			if (!ehErroTentavel(lastError.message)) throw lastError;
		}
	}
	throw lastError ?? new Error("Gemini: nenhum modelo da cadeia respondeu");
}

/**
 * Tenta um modelo em 2 passos: JSON mode → fallback de seções.
 * Erros de cota/not-found sobem pro caller (próximo modelo da cadeia).
 */
async function pesquisarComModelo(
	apiKey: string,
	modelo: string,
	promptJson: string,
	promptSecoes: string,
	lead: LeadInputCompleto,
): Promise<PesquisaGemini> {
	// 1) JSON mode
	try {
		const data = await chamarGeminiComGrounding(
			apiKey,
			modelo,
			promptJson,
			true,
		);
		const textoBruto = data.candidates?.[0]?.content?.parts?.[0]?.text;
		if (!textoBruto) {
			throw new Error("Gemini retornou resposta vazia");
		}

		const parsed = parsearJsonGemini(textoBruto);
		if (parsed) {
			return await montarResultadoGemini(parsed, data, modelo, lead);
		}
		console.log(
			`[research] ${modelo}: JSON mode retornou texto não parseável — tentando fallback de seções`,
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		// Cota não adianta repetir no mesmo modelo
		if (ehErroDeQuota(msg)) throw err;
		console.log(
			`[research] ${modelo}: JSON mode falhou (${msg}) — tentando fallback de seções`,
		);
	}

	// 2) Fallback: formato de seções (CONTATO primeiro)
	const data = await chamarGeminiComGrounding(
		apiKey,
		modelo,
		promptSecoes,
		false,
	);
	const textoBruto = data.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!textoBruto) {
		throw new Error("Gemini retornou resposta vazia");
	}
	const parsed = parsearRespostaGemini(textoBruto);
	if (!parsed) {
		throw new Error("Gemini retornou resposta em formato inesperado");
	}
	return montarResultadoGemini(parsed, data, modelo, lead);
}

/**
 * Monta o resultado final a partir de uma resposta parseada (JSON ou
 * seções): coleta fontes/queries do grounding, marca truncamento e
 * enriquece com contatos extraídos do site da empresa.
 */
async function montarResultadoGemini(
	resposta: RespostaPesquisaGemini,
	data: GeminiResponse,
	modelo: string,
	lead: LeadInputCompleto,
): Promise<PesquisaGemini> {
	const candidate = data.candidates?.[0];

	// Truncamento: sinaliza — o CONTATO vem primeiro no prompt de seções,
	// mas no JSON mode o parse já falharia e cairia no fallback.
	const truncado = candidate?.finishReason === "MAX_TOKENS";
	if (truncado) {
		console.log(
			`[research] ⚠️ ${modelo}: resposta truncada (MAX_TOKENS) — dados podem estar incompletos`,
		);
	}

	const fontes: Array<{ uri: string; titulo: string }> = [];
	for (const chunk of candidate?.groundingMetadata?.groundingChunks ?? []) {
		const uri = chunk.web?.uri;
		const titulo = chunk.web?.title;
		if (uri && titulo && !fontes.some((f) => f.uri === uri)) {
			fontes.push({ uri, titulo });
		}
	}
	const queriesUsadas = candidate?.groundingMetadata?.webSearchQueries ?? [];

	// Bônus: busca contatos extras direto do site (home + /contato)
	let contatosSite: ContatoHtml = VAZIO_CONTATO_HTML;
	const site = resposta.site ?? lead.website ?? null;
	if (site) {
		contatosSite = await extractContactsFromSite(site);
	}

	const emails = [
		...new Set([...resposta.emails, ...contatosSite.emails]),
	].slice(0, 8);
	const telefones = [
		...new Set([...resposta.telefones, ...contatosSite.telefones]),
	].slice(0, 5);
	const whatsapp = resposta.whatsapp ?? contatosSite.whatsapp;

	console.log(
		`[research] Gemini grounded OK (${modelo}): ${resposta.resumo.length} chars, ${emails.length} emails, ${telefones.length} telefones, ${whatsapp ? "1 whatsapp" : "0 whatsapp"}, ${resposta.decisores.length} decisores, ${fontes.length} fontes${truncado ? ", TRUNCADO" : ""}`,
	);

	return {
		result: {
			resumo: resposta.resumo,
			fontes,
			queriesUsadas,
			modelo,
			fonte: "gemini-grounded",
			site,
			emails,
			telefones,
			whatsapp,
			decisores: resposta.decisores,
			tentativas: [],
		},
		...(truncado
			? {
					aviso:
						"resposta truncada pelo limite de tokens (MAX_TOKENS) — dados podem estar incompletos",
				}
			: {}),
	};
}

/**
 * Prompt pro JSON mode — o Gemini responde só com JSON no schema
 * `{ resumo, site, emails, telefones, whatsapp, decisores }`.
 */
function buildResearchPromptJson(lead: LeadInputCompleto): string {
	return `${buildObjetivoPesquisa(lead)}

FORMATO DE RESPOSTA: responda SOMENTE com um JSON válido, sem markdown, sem texto fora dele, neste formato exato:

{
  "resumo": "3-5 parágrafos curtos, máximo 400 palavras, citando fontes inline",
  "site": "https://site.com.br" ou null,
  "emails": ["comercial@empresa.com.br"],
  "telefones": ["(11) 3456-7890", "(11) 99999-9999"],
  "whatsapp": "5511999999999" ou null,
  "decisores": [{ "nome": "João Silva", "cargo": "Diretor Comercial" }]
}

${buildRegrasPesquisa()}`;
}

/**
 * Prompt pro fallback de seções — o CONTATO vem ANTES do RESUMO pra
 * sobreviver a truncamento de tokens (o resumo consome a maior parte
 * do budget).
 */
function buildResearchPromptSecoes(lead: LeadInputCompleto): string {
	return `${buildObjetivoPesquisa(lead)}

FORMATO DE RESPOSTA (em PT-BR) — seções exatas, CONTATO PRIMEIRO:

===CONTATO===
Site: <url completa com https:// ou "não encontrei">
Telefone: <(11) 3456-7890; (11) 99999-9999 ou "não encontrei">
WhatsApp: <5511999999999 ou "não encontrei">
Emails: <email1, email2 ou "não encontrei">
Decisores: <Nome (Cargo); Nome (Cargo) ou "não encontrei">

===RESUMO===
[3-5 parágrafos curtos, máximo 400 palavras, citando fontes inline]

${buildRegrasPesquisa()}`;
}

function buildObjetivoPesquisa(lead: LeadInputCompleto): string {
	const contexto: string[] = [];
	contexto.push(`Nome: ${lead.nome}`);
	if (lead.razaoSocial) contexto.push(`Razão Social: ${lead.razaoSocial}`);
	if (lead.cnpj) contexto.push(`CNPJ: ${lead.cnpj}`);
	if (lead.website) contexto.push(`Site: ${lead.website}`);
	if (lead.cidade || lead.uf)
		contexto.push(
			`Localização: ${[lead.cidade, lead.uf].filter(Boolean).join(" / ")}`,
		);
	if (lead.cnaeFiscalDescricao)
		contexto.push(`Setor CNAE: ${lead.cnaeFiscalDescricao}`);

	return `Pesquise na web informações sobre esta empresa brasileira:

${contexto.join("\n")}

OBJETIVO: dar contexto para um vendedor B2B (dev solo) que vai abordar o cliente via WhatsApp. Foque em:

1. **O que a empresa faz** (serviços, produtos, público-alvo) — cite o site oficial se houver
2. **Tamanho real** (filiais, número de funcionários se público, capital social)
3. **Notícias recentes** (último ano): lançamento, expansão, problemas, mudanças
4. **Presença digital atual**: site, Instagram, LinkedIn — está ativa ou abandonada?
5. **Reputação**: reclamações no Reclame Aqui, processos, menções negativas recentes
6. **Sinais de compra**: vagas abertas, busca por fornecedores, expansão declarada
7. **CONTATO COMERCIAL** (ESSENCIAL pra abordagem):
   - **Site oficial** (URL completa, com https://)
   - **Telefones comerciais** (fixo e celular, com DDD — ex: "(11) 3456-7890", "(11) 99999-9999")
   - **WhatsApp** (número com DDD e 55, ex: "5511999999999" — só se encontrar explícito)
   - **Emails comerciais** (formato: contato@empresa.com.br, comercial@, vendas@, sac@, etc — só liste emails REAIS que encontrou, não invente)
   - **Decisores / sócios / diretoria** com nome completo e cargo (ex: "João Silva — Diretor Comercial"). Só liste se público (LinkedIn, site oficial, notícias). Se não souber, escreva "não encontrei".`;
}

function buildRegrasPesquisa(): string {
	return `REGRAS:
- Seja factual, cite o que encontrou e de onde (ex: "segundo o site oficial", "conforme Reclame Aqui")
- Se não encontrar informação sobre algum tópico, escreva "não encontrei" (ou null / lista vazia no JSON) ao invés de inventar
- NÃO invente emails, telefones ou números de WhatsApp — se não tem, "não encontrei" (ou null / lista vazia)
- NÃO invente nomes de pessoas — se não tem, "não encontrei" (ou lista vazia)
- Foque em INFORMAÇÃO ÚTIL PRA ABORDAGEM COMERCIAL`;
}

async function chamarGeminiComGrounding(
	apiKey: string,
	model: string,
	prompt: string,
	jsonMode: boolean,
): Promise<GeminiResponse> {
	const url = `${GEMINI_ENDPOINT}/${model}:generateContent`;

	const body = {
		contents: [{ parts: [{ text: prompt }] }],
		// Google Search Grounding — Gemini decide quando buscar na web
		tools: [{ googleSearch: {} }],
		generationConfig: {
			temperature: 0.3,
			// 4000 evita o corte no meio do bloco CONTATO (era 1500)
			maxOutputTokens: 4000,
			...(jsonMode ? { responseMimeType: "application/json" } : {}),
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

	return data;
}

// ==========================================================================
// TIER 2: Google Places API
// ==========================================================================

async function pesquisarPlaces(
	lead: LeadInputCompleto,
): Promise<EmpresaPesquisada | null> {
	const place = await buscarEmpresaPlaces(
		lead.razaoSocial ?? lead.nome,
		lead.cidade,
		lead.uf,
	);
	if (!place) return null;

	const resumo = formatarPlaceParaResumo(place);
	const fontes: Array<{ uri: string; titulo: string }> = [];
	if (place.mapaUrl) {
		fontes.push({
			uri: place.mapaUrl,
			titulo: `${place.nome} — Google Maps`,
		});
	}

	// Bônus: se Places retornou site, busca emails/telefones/whatsapp nele
	let contatosSite: ContatoHtml = VAZIO_CONTATO_HTML;
	if (place.website) {
		contatosSite = await extractContactsFromSite(place.website);
	}

	const telefones = [
		...new Set([
			...(place.telefone ? [place.telefone] : []),
			...contatosSite.telefones,
		]),
	].slice(0, 5);

	return {
		resumo,
		fontes,
		queriesUsadas: [
			`Places Text Search: "${lead.razaoSocial ?? lead.nome}"${
				lead.cidade ? ` ${lead.cidade}` : ""
			}${lead.uf ? ` ${lead.uf}` : ""}`,
		],
		modelo: "google-places-api",
		fonte: "places",
		site: place.website ?? null,
		emails: contatosSite.emails.slice(0, 8),
		telefones,
		whatsapp: contatosSite.whatsapp,
		decisores: [],
		tentativas: [],
	};
}

// ==========================================================================
// TIER 3: Lead data fallback (gera resumo a partir do que já tem no banco)
// ==========================================================================

function gerarResumoLeadData(
	lead: LeadInputCompleto,
	tentativas: Array<{
		tier: "gemini-grounded" | "places" | "lead-data";
		ok: boolean;
		motivo?: string;
	}>,
): EmpresaPesquisada {
	const partes: string[] = [];

	const nome = lead.razaoSocial ?? lead.nome;
	partes.push(`${nome} — lead cadastrado no King Ops.`);

	if (lead.cnaeFiscalDescricao) {
		partes.push(`Setor (CNAE): ${lead.cnaeFiscalDescricao}.`);
	}
	if (lead.porte) partes.push(`Porte: ${lead.porte}.`);
	if (lead.capitalSocialCentavos != null) {
		const capital = new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
			minimumFractionDigits: 0,
		}).format(lead.capitalSocialCentavos / 100);
		partes.push(`Capital social: ${capital}.`);
	}
	if (lead.dataInicioAtividade) {
		const anos = Math.max(
			0,
			Math.floor(
				(Date.now() - new Date(lead.dataInicioAtividade).getTime()) /
					(365.25 * 24 * 60 * 60 * 1000),
			),
		);
		if (anos > 0) {
			partes.push(`Tempo de mercado: ${anos} ${anos === 1 ? "ano" : "anos"}.`);
		}
	}
	if (lead.descricaoSituacaoCadastral) {
		partes.push(`Situação cadastral: ${lead.descricaoSituacaoCadastral}.`);
	}
	if (lead.website) partes.push(`Site: ${lead.website}.`);
	if (lead.observacoes) {
		partes.push(`Observações do Operador: ${lead.observacoes}`);
	}

	partes.push(
		"\n(Fonte: apenas dados do cadastro. Sem pesquisa externa — Gemini e Places API falharam.)",
	);

	tentativas.push({ tier: "lead-data", ok: true });

	return {
		resumo: partes.join("\n"),
		fontes: [],
		queriesUsadas: [],
		modelo: "lead-data-fallback",
		fonte: "lead-data",
		site: lead.website,
		emails: [],
		telefones: [],
		whatsapp: null,
		decisores: [],
		tentativas,
	};
}
