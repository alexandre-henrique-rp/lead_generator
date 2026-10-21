// ==========================================================================
// leads.ts — tipos + bridge RPC chamável pelo client.
// Acesso ao banco fica em `./leads.server`, carregado via import dinâmico
// dentro dos handlers (removidos do bundle do client).
// ==========================================================================

import { createHash } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const SESSION_COOKIE_NAME = "lead_generator_session";

/** Shape do lead consumido pela UI (lista e detalhe). */
export interface LeadItem {
	id: string;
	nome: string;
	razaoSocial?: string;
	cnpj?: string;
	etapa: string;
	telefone: string;
	telefoneCelular?: string;
	telefoneFixo?: string;
	temWhatsapp: boolean;
	origem: "MAPS" | "CSV" | "MANUAL" | "SITE";
	createdAt: string;
	cidade: string;
}

export interface SocioDetalhe {
	id?: number;
	uuid?: string;
	nomeSocio: string;
	cnpjCpfDoSocio?: string;
	qualificacaoSocio?: string;
	faixaEtaria?: string;
	dataEntradaSociedade?: string;
	cpfRepresentanteLegal?: string;
	nomeRepresentanteLegal?: string;
	qualificacaoRepresentanteLegal?: string;
	pais?: string;
}

/** Shape completo do lead (para a página de detalhe). */
export interface LeadDetalhe extends LeadItem {
	cpf?: string;
	cep?: string;
	logradouro?: string;
	numero?: string;
	bairro?: string;
	uf?: string;
	complemento?: string;
	tipoLogradouro?: string;
	emails?: string[];
	origemRaw: string;
	observacoes?: string;
	score?: number;
	updatedAt: string;
	dddTelefone1?: string;
	dddTelefone2?: string;
	telefoneCelular?: string;
	telefoneFixo?: string;
	emailCnpj?: string;
	email?: string;
	website?: string;
	faturamentoPresumido?: string;
	quantidadeFuncionarios?: number;
	capitalSocial?: number;
	situacaoEspecial?: string;
	dataSituacaoEspecial?: string;
	enteFederativoResponsavel?: string;
	nomeCidadeNoExterior?: string;
	pais?: string;
	codigoPais?: string;
	dddFax?: string;
	descricaoMotivoSituacaoCadastral?: string;
	// ── Enriquecimento CNPJ ──
	nomeFantasia?: string;
	identificadorMatrizFilial?: number;
	descricaoMatrizFilial?: string;
	situacaoCadastral?: number;
	descricaoSituacaoCadastral?: string;
	dataSituacaoCadastral?: string;
	motivoSituacaoCadastral?: string;
	dataInicioAtividade?: string;
	cnaeFiscal?: number;
	cnaeFiscalDescricao?: string;
	codigoNaturezaJuridica?: number;
	naturezaJuridica?: string;
	capitalSocialCentavos?: number;
	porte?: string;
	codigoPorte?: number;
	descricaoPorte?: string;
	codigoMunicipio?: number;
	codigoMunicipioIbge?: number;
	municipio?: string;
	opcaoPeloMei?: boolean;
	dataOpcaoPeloMei?: string;
	dataExclusaoDoMei?: string;
	opcaoPeloSimples?: boolean;
	dataOpcaoPeloSimples?: string;
	dataExclusaoDoSimples?: string;
	qualificacaoResponsavel?: string;
	dataUltimaConsultaCnpj?: string;
	cnaesSecundarios?: Array<{ codigo: number; descricao: string }>;
	regimeTributario?: Array<{
		ano: number;
		forma_de_tributacao: string;
		quantidade_de_escrituracoes: number;
	}>;
	qsa?: SocioDetalhe[];
}

const criarLeadSchema = z.object({
	nome: z.string().min(1, "Nome é obrigatório"),
	telefone: z.string().min(8, "Telefone é obrigatório"),
	cnpj: z.string().optional(),
	cidade: z.string().optional(),
});

const uuidParamSchema = z.object({ uuid: z.string().min(1) });

export type CriarLeadInput = z.input<typeof criarLeadSchema>;

/** Tamanhos de página aceitos pela listagem. */
export const LEADS_PAGE_SIZES = [15, 30, 50, 100] as const;

const listarLeadsSchema = z.object({
	page: z.number().int().min(1).catch(1),
	pageSize: z
		.union([
			z.literal(LEADS_PAGE_SIZES[0]),
			z.literal(LEADS_PAGE_SIZES[1]),
			z.literal(LEADS_PAGE_SIZES[2]),
			z.literal(LEADS_PAGE_SIZES[3]),
		])
		.catch(30),
	busca: z.string().catch(""),
	etapa: z.string().catch("ALL"),
	origem: z.string().catch("ALL"),
});

export type ListarLeadsInput = z.input<typeof listarLeadsSchema>;

/** Métricas globais (isActive) exibidas nos cards do topo. */
export interface LeadsMetricas {
	total: number;
	novos: number;
	qualificados: number;
	propostas: number;
}

export interface LeadsPageResult {
	items: LeadItem[];
	/** Total de leads que batem nos filtros (base da paginação). */
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	metricas: LeadsMetricas;
}

async function requireAuth(): Promise<number> {
	const token = getCookie(SESSION_COOKIE_NAME);
	if (!token) throw new Error("UNAUTHORIZED");
	const tokenHash = createHash("sha256").update(token).digest("hex");
	const { prisma } = await import("#/db");
	const sessao = await prisma.sessao.findUnique({ where: { tokenHash } });
	if (!sessao || sessao.revokedAt || sessao.expiresAt < new Date()) {
		throw new Error("UNAUTHORIZED");
	}
	return sessao.usuarioId;
}

export const listarLeadsServerFn = createServerFn({ method: "GET" })
	.validator(listarLeadsSchema)
	.handler(async ({ data }): Promise<LeadsPageResult> => {
		await requireAuth();
		const { listarLeads } = await import("./leads.server");
		return listarLeads(data);
	});

export const criarLeadServerFn = createServerFn({ method: "POST" })
	.validator(criarLeadSchema)
	.handler(async ({ data }): Promise<LeadItem> => {
		await requireAuth();
		const { criarLead } = await import("./leads.server");
		return criarLead(data);
	});

/**
 * Busca um lead pelo UUID. Retorna null se não existir.
 * Usado pela página /leads/$id.
 */
export const getLeadByUuidServerFn = createServerFn({ method: "GET" })
	.validator(uuidParamSchema)
	.handler(async ({ data: { uuid } }): Promise<LeadDetalhe | null> => {
		await requireAuth();
		const { getLeadByUuid } = await import("./leads.server");
		return getLeadByUuid(uuid);
	});

/**
 * Atualiza um lead pelo UUID. Aceita partial update.
 */
const updateLeadSchema = z.object({
	uuid: z.string().min(1),
	nome: z.string().optional(),
	razaoSocial: z.string().nullable().optional(),
	nomeFantasia: z.string().nullable().optional(),
	cnpj: z.string().nullable().optional(),
	telefone: z.string().nullable().optional(),
	telefoneCelular: z.string().nullable().optional(),
	telefoneFixo: z.string().nullable().optional(),
	telefoneNorm: z.string().nullable().optional(),
	temWhatsapp: z.boolean().optional(),
	email: z.string().nullable().optional(),
	emailCnpj: z.string().nullable().optional(),
	cidade: z.string().nullable().optional(),
	uf: z.string().nullable().optional(),
	cep: z.string().nullable().optional(),
	logradouro: z.string().nullable().optional(),
	numero: z.string().nullable().optional(),
	bairro: z.string().nullable().optional(),
	complemento: z.string().nullable().optional(),
	tipoLogradouro: z.string().nullable().optional(),
	website: z.string().nullable().optional(),
	etapa: z
		.enum([
			"NOVO",
			"CONTATADO",
			"DIAGNOSTICO",
			"QUALIFICADO",
			"PROPOSTA",
			"NEGOCIACAO",
			"GANHO",
			"PERDIDO",
		])
		.optional(),
	observacoes: z.string().nullable().optional(),
	// Dados de enriquecimento da Receita / BrasilAPI
	situacaoCadastral: z.number().nullable().optional(),
	descricaoSituacaoCadastral: z.string().nullable().optional(),
	dataSituacaoCadastral: z.string().nullable().optional(),
	motivoSituacaoCadastral: z.string().nullable().optional(),
	descricaoMotivoSituacaoCadastral: z.string().nullable().optional(),
	dataInicioAtividade: z.string().nullable().optional(),
	cnaeFiscal: z.number().nullable().optional(),
	cnaeFiscalDescricao: z.string().nullable().optional(),
	naturezaJuridica: z.string().nullable().optional(),
	codigoNaturezaJuridica: z.number().nullable().optional(),
	porte: z.string().nullable().optional(),
	codigoPorte: z.number().nullable().optional(),
	descricaoPorte: z.string().nullable().optional(),
	capitalSocial: z.number().nullable().optional(),
	faturamentoPresumido: z.string().nullable().optional(),
	quantidadeFuncionarios: z.number().nullable().optional(),
	identificadorMatrizFilial: z.number().nullable().optional(),
	descricaoMatrizFilial: z.string().nullable().optional(),
	opcaoPeloSimples: z.boolean().nullable().optional(),
	opcaoPeloMei: z.boolean().nullable().optional(),
	dataOpcaoPeloSimples: z.string().nullable().optional(),
	dataExclusaoDoSimples: z.string().nullable().optional(),
	dataOpcaoPeloMei: z.string().nullable().optional(),
	dataExclusaoDoMei: z.string().nullable().optional(),
	dddTelefone1: z.string().nullable().optional(),
	dddTelefone2: z.string().nullable().optional(),
	dddFax: z.string().nullable().optional(),
	situacaoEspecial: z.string().nullable().optional(),
	dataSituacaoEspecial: z.string().nullable().optional(),
	enteFederativoResponsavel: z.string().nullable().optional(),
	cnaesSecundarios: z
		.array(
			z.object({
				codigo: z.number(),
				descricao: z.string(),
			}),
		)
		.optional(),
	regimeTributario: z
		.array(
			z.object({
				ano: z.number(),
				forma_de_tributacao: z.string(),
				quantidade_de_escrituracoes: z.number(),
			}),
		)
		.optional(),
	qsa: z
		.array(
			z.object({
				nomeSocio: z.string(),
				cnpjCpfDoSocio: z.string().nullable().optional(),
				qualificacaoSocio: z.string().nullable().optional(),
				faixaEtaria: z.string().nullable().optional(),
				dataEntradaSociedade: z.string().nullable().optional(),
				cpfRepresentanteLegal: z.string().nullable().optional(),
				nomeRepresentanteLegal: z.string().nullable().optional(),
				qualificacaoRepresentanteLegal: z.string().nullable().optional(),
			}),
		)
		.optional(),
});

/** Normaliza CNPJ removendo tudo que não é dígito. */
function normalizarCnpj(txt: string | undefined | null): string | null {
	if (!txt) return null;
	const digits = txt.replace(/\D/g, "");
	return digits.length > 0 ? digits : null;
}

/** Normaliza telefone (só dígitos, ≥ 8 caracteres). */
function normalizarTelefone(txt: string | undefined | null): string | null {
	if (!txt) return null;
	const digits = txt.replace(/\D/g, "");
	return digits.length >= 8 ? digits : null;
}

/** Normaliza email: trim + lowercase. Retorna null se vazio. */
function normalizarEmail(txt: string | undefined | null): string | null {
	if (!txt) return null;
	const trimmed = txt.trim().toLowerCase();
	return trimmed.length > 0 ? trimmed : null;
}

export const updateLeadServerFn = createServerFn({ method: "POST" })
	.validator(updateLeadSchema)
	.handler(async ({ data }): Promise<LeadDetalhe | null> => {
		await requireAuth();
		// Normaliza CNPJ e telefones para somente dígitos antes de persistir
		const payload = {
			...data,
			cnpj: data.cnpj !== undefined ? normalizarCnpj(data.cnpj) : undefined,
			telefoneCelular:
				data.telefoneCelular !== undefined
					? normalizarTelefone(data.telefoneCelular)
					: undefined,
			telefoneFixo:
				data.telefoneFixo !== undefined
					? normalizarTelefone(data.telefoneFixo)
					: undefined,
			email: data.email !== undefined ? normalizarEmail(data.email) : undefined,
			emailCnpj:
				data.emailCnpj !== undefined
					? normalizarEmail(data.emailCnpj)
					: undefined,
		};
		// "telefone" (legado) = celular se existir, senão fixo
		const telefoneInformado =
			data.telefone !== undefined ||
			data.telefoneCelular !== undefined ||
			data.telefoneFixo !== undefined;
		if (data.telefone !== undefined) {
			payload.telefone = normalizarTelefone(data.telefone);
		} else if (telefoneInformado) {
			payload.telefone = payload.telefoneCelular ?? payload.telefoneFixo;
		}
		// telefoneNorm = primeiro telefone disponível (celular > fixo > telefone).
		// Só reescreve quando o update tocou em algum telefone — senão apagaria
		// o telefoneNorm existente em updates que não enviam telefone.
		if (telefoneInformado) {
			const telefones = [
				payload.telefoneCelular,
				payload.telefoneFixo,
				payload.telefone,
			].filter(Boolean) as string[];
			payload.telefoneNorm = telefones[0] ?? null;
		}

		const { updateLead } = await import("./leads.server");
		return updateLead(payload);
	});

/**
 * Exclui um lead pelo UUID, junto com sócios e histórico de consulta CNPJ.
 * Projetos vinculados são preservados (desvinculados, FK SetNull).
 */
export const excluirLeadServerFn = createServerFn({ method: "POST" })
	.validator(uuidParamSchema)
	.handler(async ({ data: { uuid } }): Promise<{ nome: string }> => {
		await requireAuth();
		const { excluirLead } = await import("./leads.server");
		return excluirLead(uuid);
	});
