// ==========================================================================
// King Ops — api/cnpj.ts
// --------------------------------------------------------------------------
// Server functions para consultar CNPJ na BrasilAPI (gratuita, sem chave)
// e salvar/atualizar o lead com os dados enriquecidos.
//
// Padrão .server.ts: só `createServerFn` + types exportados.
// Prisma via dynamic import dentro dos handlers.
// ==========================================================================

import { createHash } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { consultarCnpjComFallback } from "#/lib/cnpj-provider";
import {
	estimarPorteEFaturamento,
	inferirWebsiteDeEmail,
} from "#/lib/empresa-porte";

const SESSION_COOKIE_NAME = "lead_generator_session";

const uuidParamSchema = z.object({ uuid: z.string().min(1) });

/**
 * Schema do input: aceita o CNPJ como string livre.
 * O client passa o CNPJ que o Operador digitou no form (com ou sem máscara);
 * a função normaliza para 14 dígitos.
 */
const atualizarCnpjInputSchema = z.object({
	uuid: z.string().min(1),
	/** CNPJ com ou sem máscara. Opcional — se ausente, usa o CNPJ do banco. */
	cnpj: z.string().optional(),
});

export type CnpjApiResponse = {
	uf: string | null;
	cep: string | null;
	qsa: Array<{
		identificador_de_socio: number | null;
		nome_socio: string;
		cnpj_cpf_do_socio: string | null;
		qualificacao_socio: string | null;
		data_entrada_sociedade: string | null;
		faixa_etaria: string | null;
		pais: string | null;
		codigo_pais: string | null;
		codigo_faixa_etaria: number | null;
		codigo_qualificacao_socio: number | null;
		cpf_representante_legal?: string | null;
		nome_representante_legal?: string | null;
		qualificacao_representante_legal?: string | null;
		codigo_qualificacao_representante_legal?: number | null;
	}>;
	cnpj: string;
	pais: string | null;
	email: string | null;
	porte: string | null;
	bairro: string | null;
	numero: string | null;
	ddd_fax: string | null;
	municipio: string | null;
	logradouro: string | null;
	cnae_fiscal: number | null;
	codigo_pais: string | null;
	complemento: string | null;
	codigo_porte: number | null;
	razao_social: string;
	nome_fantasia: string | null;
	capital_social: number;
	ddd_telefone_1: string | null;
	ddd_telefone_2: string | null;
	opcao_pelo_mei: boolean | string | null;
	descricao_porte: string | null;
	codigo_municipio: number | null;
	cnaes_secundarios: Array<{ codigo: number; descricao: string }>;
	natureza_juridica: string | null;
	regime_tributario: Array<{
		ano: number;
		forma_de_tributacao: string;
		quantidade_de_escrituracoes: number;
	}>;
	situacao_especial: string | null;
	opcao_pelo_simples: boolean | string | null;
	situacao_cadastral: number;
	data_opcao_pelo_mei: string | null;
	data_exclusao_do_mei: string | null;
	cnae_fiscal_descricao: string | null;
	codigo_municipio_ibge: number | null;
	data_inicio_atividade: string | null;
	data_situacao_especial: string | null;
	data_opcao_pelo_simples: string | null;
	data_situacao_cadastral: string | null;
	nome_cidade_no_exterior: string | null;
	codigo_natureza_juridica: number | null;
	data_exclusao_do_simples: string | null;
	motivo_situacao_cadastral: number | null;
	ente_federativo_responsavel: string | null;
	identificador_matriz_filial: number | null;
	qualificacao_do_responsavel: number | null;
	descricao_situacao_cadastral: string;
	descricao_tipo_de_logradouro: string | null;
	descricao_motivo_situacao_cadastral: string | null;
	descricao_identificador_matriz_filial: string | null;
};

export type AtualizarCnpjResponse = {
	ok: boolean;
	leadUuid: string;
	cnpj: string;
	razaoSocial: string;
	situacao: string;
	atualizadoEm: string;
	socios: number;
	consultaUuid: string;
	message: string;
	/** Dados completos do lead após a atualização (para o client atualizar o form) */
	lead: {
		uuid: string;
		nome: string;
		razaoSocial: string | null;
		cnpj: string | null;
		cep: string | null;
		logradouro: string | null;
		numero: string | null;
		bairro: string | null;
		cidade: string | null;
		uf: string | null;
		telefone: string | null;
		website: string | null;
		dddTelefone1: string | null;
		dddTelefone2: string | null;
		emailCnpj: string | null;
		email: string | null;
		observacoes: string | null;
		descricaoSituacaoCadastral: string | null;
		porte: string | null;
		capitalSocialCentavos: number | null;
	};
};

async function requireAuth(): Promise<{
	id: number;
	ip: string | null;
	userAgent: string | null;
}> {
	const token = getCookie(SESSION_COOKIE_NAME);
	if (!token) throw new Error("UNAUTHORIZED");
	const tokenHash = createHash("sha256").update(token).digest("hex");
	const { prisma } = await import("#/db");
	const sessao = await prisma.sessao.findUnique({ where: { tokenHash } });
	if (!sessao || sessao.revokedAt || sessao.expiresAt < new Date()) {
		throw new Error("UNAUTHORIZED");
	}
	return {
		id: sessao.usuarioId,
		ip: sessao.ip,
		userAgent: sessao.userAgent,
	};
}

/**
 * Consulta CNPJ com fallback automático BrasilAPI → OpenCNPJ.
 *
 * Tenta primeiro a BrasilAPI (configurável via CNPJ_API_URL). Se ela bloquear
 * este servidor (403), der 5xx persistente ou falhar por rede, cai para
 * OpenCNPJ (https://api.opencnpj.org/{cnpj}) como fallback.
 *
 * Retry com backoff exponencial para 5xx e erros de rede (transitórios)
 * em cada provedor. Não faz retry em 4xx (erros definitivos).
 *
 * Lança erros tipados para o caller mapear para mensagem amigável:
 *  - "CNPJ_NAO_ENCONTRADO" → 404 (CNPJ não existe)
 *  - "RATE_LIMIT:<segundos>" → 429 (com Retry-After)
 *  - "API_ERROR:<status>:após N tentativas" → 5xx persistente em ambos
 *  - "NETWORK_ERROR" → falha de rede em ambos
 */
async function consultarCnpjNaApi(cnpj: string): Promise<{
	data: CnpjApiResponse;
	fonte: "BRASILAPI" | "OPEN_CNPJ" | "RECEITAWS";
}> {
	return consultarCnpjComFallback(
		() => consultarCnpjBrasilAPI(cnpj),
		() => consultarCnpjOpenCNPJ(cnpj),
		(err) => {
			const msg = err instanceof Error ? err.message : String(err);
			console.log(`[cnpj-api] BrasilAPI falhou (${msg}) — tentando OpenCNPJ`);
		},
	);
}

/**
 * BrasilAPI: https://brasilapi.com.br/api/cnpj/v1/{cnpj}
 * Gratuita, sem chave, retorna JSON com formato específico.
 */
async function consultarCnpjBrasilAPI(cnpj: string): Promise<CnpjApiResponse> {
	const baseUrl =
		process.env.CNPJ_API_URL ?? "https://brasilapi.com.br/api/cnpj/v1";
	const url = `${baseUrl}/${cnpj}`;

	const maxTentativas = 2; // 1 retry só — não esperamos 7s pra cair no OpenCNPJ
	const delayMs = 800;
	const fetchTimeoutMs = 4000;

	let lastError: Error | null = null;
	for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
			const res = await fetch(url, {
				signal: controller.signal,
				headers: {
					Accept: "application/json",
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 KingOps/1.0",
				},
			});
			clearTimeout(timeout);

			// 404 = CNPJ não existe — não tenta de novo
			if (res.status === 404) {
				throw new Error("CNPJ_NAO_ENCONTRADO");
			}

			// 429 = rate limit — não tenta de novo
			if (res.status === 429) {
				const retryAfter = res.headers.get("retry-after");
				const seconds = Number.parseInt(retryAfter ?? "60", 10) || 60;
				throw new Error(`RATE_LIMIT:${seconds}`);
			}

			// 5xx = erro do servidor — TRANSIENT, tenta de novo
			if (res.status >= 500) {
				throw new Error(`API_ERROR:${res.status}`);
			}

			// Outros 4xx = erro do cliente (CNPJ malformado, etc) — não tenta
			if (!res.ok) {
				throw new Error(`API_ERROR:${res.status}`);
			}

			return (await res.json()) as CnpjApiResponse;
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			const msg = lastError.message;

			// Erros definitivos — não tenta de novo
			if (
				msg === "CNPJ_NAO_ENCONTRADO" ||
				msg.startsWith("RATE_LIMIT:") ||
				(msg.startsWith("API_ERROR:") && /^API_ERROR:[3-4]/.test(msg))
			) {
				throw lastError;
			}

			// Transient — 1 retry só
			if (tentativa < maxTentativas) {
				console.log(
					`[cnpj-api] tentativa ${tentativa}/${maxTentativas} falhou (${msg}) — retry em ${delayMs}ms`,
				);
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				continue;
			}

			// Esgotou — propaga erro tipado
			if (msg.startsWith("API_ERROR:")) {
				throw new Error(`${msg}:instável`);
			}
			if (msg.includes("abort") || msg.includes("timeout")) {
				throw new Error("NETWORK_ERROR:timeout");
			}
			throw new Error("NETWORK_ERROR:sem-resposta");
		}
	}

	throw lastError ?? new Error("API_ERROR: desconhecido");
}

function parseCnpj(s: string): string {
	return s.replace(/\D/g, "");
}

// ==========================================================================
// OpenCNPJ fallback (https://api.opencnpj.org/{cnpj})
// Gratuito, sem chave de API, formato similar ao BrasilAPI.
// ==========================================================================

interface OpenCnpjQsa {
	nome_socio: string;
	cnpj_cpf_socio: string | null;
	qualificacao_socio: string | null;
	data_entrada_sociedade: string | null;
	identificador_socio: string | null;
	codigo_pais: string | null;
	pais: { codigo: string; descricao: string } | null;
	representante_legal: string | null;
	nome_representante: string | null;
	qualificacao_representante: { codigo: string; descricao: string } | null;
	faixa_etaria: string | null;
}

interface OpenCnpjTelefone {
	ddd: string;
	numero: string;
	is_fax: boolean;
}

interface OpenCnpjResponse {
	cnpj: string;
	razao_social: string;
	nome_fantasia: string | null;
	situacao_cadastral: string;
	data_situacao_cadastral: string;
	matriz_filial: string;
	data_inicio_atividade: string;
	cnae_principal: string;
	cnaes_secundarios: string[];
	cnaes: Array<{ codigo: string; descricao: string; is_principal: boolean }>;
	codigo_natureza_juridica: string;
	natureza_juridica: string;
	tipo_logradouro: string;
	logradouro: string;
	numero: string;
	complemento: string | null;
	bairro: string;
	cep: string;
	uf: string;
	municipio: string;
	codigo_municipio: string;
	email: string | null;
	telefones: OpenCnpjTelefone[];
	capital_social: string;
	qualificacao_responsavel: { codigo: string; descricao: string } | null;
	porte_empresa: string;
	ente_federativo?: string;
	pais?: { codigo: string; descricao: string } | null;
	opcao_simples: string;
	data_opcao_simples: string;
	opcao_mei: string;
	data_opcao_mei: string;
	motivo_situacao_cadastral: { codigo: string; descricao: string } | null;
	QSA: OpenCnpjQsa[];
}

/**
 * Converte resposta do OpenCNPJ pro formato CnpjApiResponse (usado pelo projeto).
 * Mesma estrutura de campos, mas com mapeamento de tipos:
 *  - `cnaes_secundarios`: OpenCNPJ retorna string[], projeto espera {codigo, descricao}[]
 *  - `telefones`: OpenCNPJ retorna array, projeto espera ddd_telefone_1 / ddd_telefone_2
 *  - `capital_social`: OpenCNPJ retorna "2000000,00" (string BR), projeto espera number
 *  - `situacao_cadastral`: OpenCNPJ retorna "Ativa", projeto espera number (código)
 *  - `porte_empresa`: "Demais" → mapeia pro enum do projeto
 */
function mapOpenCnpjToResponse(r: OpenCnpjResponse): CnpjApiResponse {
	// Mapear situação cadastral (texto → código)
	const situacaoCodigo: Record<string, number> = {
		ativa: 1,
		suspensa: 2,
		baixada: 3,
		nula: 4,
		"01": 1,
		"02": 2,
		"03": 3,
		"04": 4,
		"08": 8,
	};
	const sitLower = (r.situacao_cadastral || "").toLowerCase();
	const sitCodigo =
		situacaoCodigo[sitLower] ?? Number(r.situacao_cadastral) ?? 2;

	// Mapear porte
	const porteMap: Record<string, string> = {
		demais: "DEMAIS",
		"micro empresa": "MICRO",
		"empresa de pequeno porte": "EPP",
		pequeno: "EPP",
		medio: "DEMAIS",
		grande: "DEMAIS",
		micro: "MICRO",
	};
	const porteStr = (r.porte_empresa || "").toLowerCase().trim();
	const porteNormalizado = porteMap[porteStr] ?? r.porte_empresa ?? "DEMAIS";

	// Parse capital social ("2000000,00" → 2000000.00)
	const capitalLimpo = r.capital_social.replace(/\./g, "").replace(",", ".");
	const capitalNumerico = Number.parseFloat(capitalLimpo) || 0;

	// Telefones (pega DDD + número, separando fixo do fax)
	const tels = r.telefones.filter((t) => !t.is_fax);
	const telsFax = r.telefones.filter((t) => t.is_fax);
	const tel1 = tels[0] ? `${tels[0].ddd}${tels[0].numero}` : null;
	const tel2 = tels[1] ? `${tels[1].ddd}${tels[1].numero}` : null;
	const fax1 = telsFax[0] ? `${telsFax[0].ddd}${telsFax[0].numero}` : null;

	// CNAEs secundários (string[] → {codigo, descricao}[])
	const cnaesSec = r.cnaes_secundarios
		.map((codigo) => {
			const detail = r.cnaes.find((c) => c.codigo === codigo);
			return { codigo: Number(codigo), descricao: detail?.descricao ?? "" };
		})
		.filter((c) => !Number.isNaN(c.codigo));

	// QSA — mapear identificador_de_socio (texto → número)
	const idSocioMap: Record<string, number> = {
		"pessoa física": 1,
		"pessoa juridica": 2,
		"pessoa jurídica": 2,
		"pessoas físicas": 1,
		"pessoas jurídicas": 2,
		"pessoas fisicas": 1,
		"pessoas juridicas": 2,
	};

	const qsa = (r.QSA || []).map((s) => {
		const idStr = (s.identificador_socio || "").toLowerCase();
		return {
			identificador_de_socio: idSocioMap[idStr] ?? null,
			nome_socio: s.nome_socio,
			cnpj_cpf_do_socio: s.cnpj_cpf_socio,
			qualificacao_socio: s.qualificacao_socio,
			data_entrada_sociedade: s.data_entrada_sociedade,
			faixa_etaria: s.faixa_etaria,
			pais: s.pais?.descricao ?? null,
			codigo_pais: s.codigo_pais,
			codigo_faixa_etaria: null,
			codigo_qualificacao_socio: null,
			cpf_representante_legal: s.representante_legal,
			nome_representante_legal: s.nome_representante,
			qualificacao_representante_legal:
				s.qualificacao_representante?.descricao ?? null,
			codigo_qualificacao_representante_legal: null,
		};
	});

	// Mapear matriz/filial
	const matrizFilial = (r.matriz_filial || "").toLowerCase().includes("filial")
		? 2
		: 1;

	// Porte código
	const porteCodigo =
		porteNormalizado === "MICRO" ? 1 : porteNormalizado === "EPP" ? 3 : 5;

	return {
		cnpj: r.cnpj,
		razao_social: r.razao_social,
		nome_fantasia: r.nome_fantasia || null,
		situacao_cadastral: sitCodigo,
		descricao_situacao_cadastral: r.situacao_cadastral,
		data_situacao_cadastral: r.data_situacao_cadastral || null,
		data_inicio_atividade: r.data_inicio_atividade || null,
		identificador_matriz_filial: matrizFilial,
		descricao_identificador_matriz_filial: r.matriz_filial,
		motivo_situacao_cadastral: r.motivo_situacao_cadastral
			? Number(r.motivo_situacao_cadastral.codigo) || null
			: null,
		descricao_motivo_situacao_cadastral:
			r.motivo_situacao_cadastral?.descricao ?? null,
		cnae_fiscal: Number(r.cnae_principal) || null,
		cnae_fiscal_descricao:
			r.cnaes.find((c) => c.codigo === r.cnae_principal)?.descricao ?? null,
		codigo_natureza_juridica: Number(r.codigo_natureza_juridica) || null,
		natureza_juridica: r.natureza_juridica || null,
		capital_social: capitalNumerico,
		porte: porteNormalizado,
		descricao_porte: r.porte_empresa,
		codigo_porte: porteCodigo,
		// Endereço
		descricao_tipo_de_logradouro: r.tipo_logradouro || null,
		logradouro: r.logradouro || null,
		numero: r.numero || null,
		complemento: r.complemento,
		bairro: r.bairro || null,
		cep: r.cep || null,
		uf: r.uf || null,
		municipio: r.municipio || null,
		codigo_municipio: r.codigo_municipio ? Number(r.codigo_municipio) : null,
		codigo_municipio_ibge: null,
		// Contato
		email: r.email || null,
		ddd_telefone_1: tel1,
		ddd_telefone_2: tel2,
		ddd_fax: fax1,
		// Simples/MEI (OpenCNPJ retorna vazio se não optante)
		opcao_pelo_mei: r.opcao_mei ? true : false,
		data_opcao_pelo_mei: r.data_opcao_mei || null,
		data_exclusao_do_mei: null,
		opcao_pelo_simples: r.opcao_simples ? true : false,
		data_opcao_pelo_simples: r.data_opcao_simples || null,
		data_exclusao_do_simples: null,
		// Outros
		cnaes_secundarios: cnaesSec,
		regime_tributario: [],
		qualificacao_do_responsavel: r.qualificacao_responsavel
			? Number(r.qualificacao_responsavel.codigo) || null
			: null,
		situacao_especial: null,
		data_situacao_especial: null,
		ente_federativo_responsavel: r.ente_federativo || null,
		nome_cidade_no_exterior: null,
		pais: r.pais?.descricao || null,
		codigo_pais: r.pais?.codigo || null,
		qsa,
	};
}

/**
 * OpenCNPJ: https://api.opencnpj.org/{cnpj}
 * Gratuito, sem chave. Retorna JSON com `razao_social`, `cnaes`, `QSA`, etc.
 */
async function consultarCnpjOpenCNPJ(cnpj: string): Promise<CnpjApiResponse> {
	const url = `https://api.opencnpj.org/${cnpj}`;

	const maxTentativas = 2; // 1 retry só
	const delayMs = 800;
	const fetchTimeoutMs = 4000;

	let lastError: Error | null = null;
	for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
			const res = await fetch(url, {
				signal: controller.signal,
				headers: {
					Accept: "application/json",
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 KingOps/1.0",
				},
			});
			clearTimeout(timeout);

			// 404 = CNPJ não existe
			if (res.status === 404) {
				throw new Error("CNPJ_NAO_ENCONTRADO");
			}

			if (res.status === 429) {
				const retryAfter = res.headers.get("retry-after");
				const seconds = Number.parseInt(retryAfter ?? "60", 10) || 60;
				throw new Error(`RATE_LIMIT:${seconds}`);
			}

			// 5xx = erro do servidor — TRANSIENT
			if (res.status >= 500) {
				throw new Error(`API_ERROR:${res.status}`);
			}

			// Outros 4xx = erro do cliente — não tenta
			if (!res.ok) {
				throw new Error(`API_ERROR:${res.status}`);
			}

			const data = (await res.json()) as OpenCnpjResponse;
			return mapOpenCnpjToResponse(data);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			const msg = lastError.message;

			// Erros definitivos
			if (
				msg === "CNPJ_NAO_ENCONTRADO" ||
				msg.startsWith("RATE_LIMIT:") ||
				(msg.startsWith("API_ERROR:") && /^API_ERROR:[3-4]/.test(msg))
			) {
				throw lastError;
			}

			// Transient — 1 retry só
			if (tentativa < maxTentativas) {
				console.log(
					`[cnpj-opencnpj] tentativa ${tentativa}/${maxTentativas} falhou (${msg}) — retry em ${delayMs}ms`,
				);
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				continue;
			}

			if (msg.startsWith("API_ERROR:")) {
				throw new Error(`${msg}:instável`);
			}
			if (msg.includes("abort") || msg.includes("timeout")) {
				throw new Error("NETWORK_ERROR:timeout");
			}
			throw new Error("NETWORK_ERROR:sem-resposta");
		}
	}

	throw lastError ?? new Error("API_ERROR: desconhecido");
}

function parseDateBR(s: string | null | undefined): Date | null {
	if (!s) return null;
	const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!m) return null;
	const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
	return Number.isNaN(d.getTime()) ? null : d;
}

function parseBool(s: boolean | string | null | undefined): boolean | null {
	if (s == null) return null;
	if (typeof s === "boolean") return s;
	const v = s.toLowerCase();
	if (v === "true" || v === "sim") return true;
	if (v === "false" || v === "nao" || v === "não") return false;
	return null;
}

/**
 * Server function: consulta CNPJ na API externa, atualiza o lead com os
 * dados enriquecidos + persiste o QSA + grava log de CnpjConsulta.
 *
 * Aceita o CNPJ como parâmetro (do form do Operador) OU usa o CNPJ
 * já salvo no banco. Isso permite consultar e enriquecer o lead
 * sem ter que salvar antes.
 */
export const atualizarLeadCnpjServerFn = createServerFn({ method: "POST" })
	.validator(atualizarCnpjInputSchema)
	.handler(
		async ({
			data: { uuid, cnpj: cnpjInput },
		}): Promise<AtualizarCnpjResponse> => {
			const { ip, userAgent } = await requireAuth();
			const { prisma } = await import("#/db");

			const lead = await prisma.lead.findUnique({ where: { uuid } });
			if (!lead || !lead.isActive) {
				throw new Error("Lead não encontrado");
			}

			// Origem do CNPJ: do input (form) tem prioridade; senão, do banco.
			const cnpjOrigem =
				cnpjInput && cnpjInput.trim().length > 0 ? cnpjInput : lead.cnpj;
			if (!cnpjOrigem) {
				throw new Error("Informe um CNPJ (ou salve o lead com CNPJ antes).");
			}

			const cnpjNorm = parseCnpj(cnpjOrigem);
			if (cnpjNorm.length !== 14) {
				throw new Error("CNPJ inválido (precisa ter 14 dígitos).");
			}

			const fonte = process.env.CNPJ_API_URL?.includes("brasilapi")
				? "BRASILAPI"
				: "RECEITAWS";

			// ── Tentativa de consulta + log mesmo em caso de erro ──
			let consulta: Awaited<ReturnType<typeof prisma.cnpjConsulta.create>>;
			let apiData: CnpjApiResponse;
			let fonteUsada: "BRASILAPI" | "OPEN_CNPJ" | "RECEITAWS" = fonte;
			try {
				const result = await consultarCnpjNaApi(cnpjNorm);
				apiData = result.data;
				fonteUsada = result.fonte;
			} catch (err: unknown) {
				const raw = err instanceof Error ? err.message : String(err);
				let status: "NAO_ENCONTRADO" | "ERRO_API" | "RATE_LIMIT" = "ERRO_API";
				let userMessage = `Erro ao consultar CNPJ: ${raw}`;

				if (raw === "CNPJ_NAO_ENCONTRADO") {
					status = "NAO_ENCONTRADO";
					userMessage = "CNPJ não encontrado na base da Receita Federal";
				} else if (raw.startsWith("RATE_LIMIT:")) {
					const seconds = raw.split(":")[1] ?? "60";
					status = "RATE_LIMIT";
					userMessage = `API de CNPJ com limite de requisições excedido. Tente novamente em ${seconds}s.`;
				} else if (raw.startsWith("API_ERROR:")) {
					// Formato novo: "API_ERROR:500:após 3 tentativas — BrasilAPI pode estar instável"
					// ou antigo: "API_ERROR:500"
					const parts = raw.split(":");
					const code = parts[1] ?? "?";
					const isTransient = code.startsWith("5");
					userMessage = isTransient
						? `BrasilAPI retornou erro ${code} (servidor instável) após 3 tentativas. Tente novamente em 1-2 minutos.`
						: `API de CNPJ retornou erro ${code}. Tente novamente.`;
				} else if (raw.startsWith("NETWORK_ERROR")) {
					userMessage =
						"Falha de rede ao consultar CNPJ. Verifique sua conexão e tente novamente.";
				}

				consulta = await prisma.cnpjConsulta.create({
					data: {
						leadId: lead.id,
						cnpjConsultado: cnpjNorm,
						status,
						fonte,
						mensagemErro: raw,
						ip: ip ?? undefined,
						userAgent: userAgent ?? undefined,
					},
				});

				throw new Error(`${userMessage} (consulta ${consulta.uuid})`);
			}

			// ── Sucesso: atualiza lead + recria QSA + grava log ──
			const porteInfo = estimarPorteEFaturamento(
				apiData.porte,
				parseBool(apiData.opcao_pelo_simples),
				parseBool(apiData.opcao_pelo_mei),
			);
			const websiteInferido =
				lead.website || inferirWebsiteDeEmail(apiData.email);
			// E-mail da API preenche o campo principal só se o lead ainda não
			// tiver um — não sobrescreve e-mail cadastrado manualmente.
			const emailApi = apiData.email?.trim().toLowerCase() || null;

			const [, , , consultaOk] = await prisma.$transaction([
				prisma.lead.update({
					where: { id: lead.id },
					data: {
						cnpj: parseCnpj(apiData.cnpj), // só dígitos no banco
						cnpjNorm: parseCnpj(apiData.cnpj),
						nomeFantasia: apiData.nome_fantasia,
						razaoSocial: apiData.razao_social,
						cep: apiData.cep,
						logradouro: apiData.logradouro,
						numero: apiData.numero,
						bairro: apiData.bairro,
						cidade: apiData.municipio,
						uf: apiData.uf,
						complemento: apiData.complemento,
						tipoLogradouro: apiData.descricao_tipo_de_logradouro,
						codigoMunicipio: apiData.codigo_municipio,
						codigoMunicipioIbge: apiData.codigo_municipio_ibge,
						dddTelefone1: apiData.ddd_telefone_1,
						dddTelefone2: apiData.ddd_telefone_2,
						dddFax: apiData.ddd_fax,
						emailCnpj: apiData.email?.toLowerCase().trim() || null,
						email: lead.email ?? emailApi,
						website: websiteInferido,
						faturamentoPresumido: porteInfo.faturamentoPresumido,
						quantidadeFuncionarios: porteInfo.quantidadeFuncionariosMin,
						capitalSocial: apiData.capital_social,
						situacaoEspecial: apiData.situacao_especial,
						dataSituacaoEspecial: parseDateBR(apiData.data_situacao_especial),
						enteFederativoResponsavel: apiData.ente_federativo_responsavel,
						nomeCidadeNoExterior: apiData.nome_cidade_no_exterior,
						pais: apiData.pais,
						codigoPais: apiData.codigo_pais,
						identificadorMatrizFilial: apiData.identificador_matriz_filial,
						descricaoMatrizFilial:
							apiData.descricao_identificador_matriz_filial,
						situacaoCadastral: apiData.situacao_cadastral,
						descricaoSituacaoCadastral: apiData.descricao_situacao_cadastral,
						dataSituacaoCadastral: parseDateBR(apiData.data_situacao_cadastral),
						motivoSituacaoCadastral:
							apiData.descricao_motivo_situacao_cadastral,
						descricaoMotivoSituacaoCadastral:
							apiData.descricao_motivo_situacao_cadastral,
						dataInicioAtividade: parseDateBR(apiData.data_inicio_atividade),
						cnaeFiscal: apiData.cnae_fiscal,
						cnaeFiscalDescricao: apiData.cnae_fiscal_descricao,
						codigoNaturezaJuridica: apiData.codigo_natureza_juridica,
						naturezaJuridica: apiData.natureza_juridica,
						capitalSocialCentavos: Math.round(apiData.capital_social * 100),
						porte: apiData.porte,
						codigoPorte: apiData.codigo_porte,
						descricaoPorte: apiData.descricao_porte,
						opcaoPeloMei: parseBool(apiData.opcao_pelo_mei),
						dataOpcaoPeloMei: parseDateBR(apiData.data_opcao_pelo_mei),
						dataExclusaoDoMei: parseDateBR(apiData.data_exclusao_do_mei),
						opcaoPeloSimples: parseBool(apiData.opcao_pelo_simples),
						dataOpcaoPeloSimples: parseDateBR(apiData.data_opcao_pelo_simples),
						dataExclusaoDoSimples: parseDateBR(
							apiData.data_exclusao_do_simples,
						),
						qualificacaoResponsavel:
							apiData.qualificacao_do_responsavel?.toString(),
						dataUltimaConsultaCnpj: new Date(),
						jsonCnaesSecundarios: JSON.stringify(
							apiData.cnaes_secundarios ?? [],
						),
						jsonRegimeTributario: JSON.stringify(
							apiData.regime_tributario ?? [],
						),
						jsonQsa: JSON.stringify(apiData.qsa ?? []),
					},
				}),
				// recria QSA
				prisma.socio.deleteMany({ where: { leadId: lead.id } }),
				prisma.socio.createMany({
					data: (apiData.qsa ?? []).map((s, idx) => ({
						leadId: lead.id,
						identificadorDeSocio: s.identificador_de_socio,
						nomeSocio: s.nome_socio,
						cnpjCpfDoSocio: s.cnpj_cpf_do_socio,
						qualificacaoSocio: s.qualificacao_socio,
						codigoQualificacaoSocio: s.codigo_qualificacao_socio,
						dataEntradaSociedade: parseDateBR(s.data_entrada_sociedade),
						faixaEtaria: s.faixa_etaria,
						codigoFaixaEtaria: s.codigo_faixa_etaria,
						pais: s.pais,
						codigoPais: s.codigo_pais,
						cpfRepresentanteLegal: s.cpf_representante_legal ?? null,
						nomeRepresentanteLegal: s.nome_representante_legal ?? null,
						qualificacaoRepresentanteLegal:
							s.qualificacao_representante_legal ?? null,
						codigoQualificacaoRepresentanteLegal:
							s.codigo_qualificacao_representante_legal ?? null,
						ordem: idx,
					})),
				}),
				prisma.cnpjConsulta.create({
					data: {
						leadId: lead.id,
						cnpjConsultado: cnpjNorm,
						status: "SUCESSO",
						fonte: fonteUsada,
						ip: ip ?? undefined,
						userAgent: userAgent ?? undefined,
					},
				}),
				prisma.interacaoLead.create({
					data: {
						leadId: lead.id,
						tipo: "BRASILAPI",
						resumo: `Dados da Receita Federal sincronizados (Capital Social R$ ${apiData.capital_social ? apiData.capital_social.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"} · ${(apiData.qsa ?? []).length} sócios no QSA).`,
					},
				}),
			]);

			return {
				ok: true,
				leadUuid: lead.uuid,
				cnpj: apiData.cnpj,
				razaoSocial: apiData.razao_social,
				situacao: apiData.descricao_situacao_cadastral,
				atualizadoEm: new Date().toISOString(),
				socios: (apiData.qsa ?? []).length,
				consultaUuid: consultaOk.uuid,
				message: `CNPJ ${apiData.cnpj} atualizado. ${(apiData.qsa ?? []).length} sócio(s) registrado(s).`,
				lead: {
					uuid: lead.uuid,
					nome: apiData.nome_fantasia ?? apiData.razao_social,
					razaoSocial: apiData.razao_social,
					cnpj: parseCnpj(apiData.cnpj),
					cep: apiData.cep,
					logradouro: apiData.logradouro,
					numero: apiData.numero,
					bairro: apiData.bairro,
					cidade: apiData.municipio,
					uf: apiData.uf,
					telefone: apiData.ddd_telefone_1 ?? apiData.ddd_telefone_2,
					dddTelefone1: apiData.ddd_telefone_1,
					dddTelefone2: apiData.ddd_telefone_2,
					emailCnpj: apiData.email,
					email: lead.email ?? emailApi,
					website: websiteInferido,
					observacoes: null,
					descricaoSituacaoCadastral: apiData.descricao_situacao_cadastral,
					porte: apiData.porte,
					capitalSocialCentavos: Math.round(apiData.capital_social * 100),
				},
			};
		},
	);

/**
 * Server function: retorna o histórico de consultas de CNPJ do lead.
 */
export const getHistoricoCnpjServerFn = createServerFn({ method: "GET" })
	.validator(uuidParamSchema)
	.handler(async ({ data: { uuid } }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const lead = await prisma.lead.findUnique({
			where: { uuid },
			select: { id: true },
		});
		if (!lead) return { consultas: [] };

		const consultas = await prisma.cnpjConsulta.findMany({
			where: { leadId: lead.id },
			orderBy: { dataConsulta: "desc" },
			take: 20,
			select: {
				uuid: true,
				cnpjConsultado: true,
				dataConsulta: true,
				status: true,
				fonte: true,
				mensagemErro: true,
			},
		});
		return { consultas };
	});

/**
 * Server function: retorna o QSA (sócios) do lead.
 */
export const getSociosLeadServerFn = createServerFn({ method: "GET" })
	.validator(uuidParamSchema)
	.handler(async ({ data: { uuid } }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const lead = await prisma.lead.findUnique({
			where: { uuid },
			select: { id: true },
		});
		if (!lead) return { socios: [] };

		const socios = await prisma.socio.findMany({
			where: { leadId: lead.id },
			orderBy: { ordem: "asc" },
		});
		return { socios };
	});
