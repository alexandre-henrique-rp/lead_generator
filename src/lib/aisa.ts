/**
 * Utilitários e tipos para integração com a AIsa API (https://api.aisa.one)
 * e com a Google Maps Places API (direto).
 *
 * Motores homologados:
 * 1. Apollo (AIsa → /apollo/mixed_companies/search) — Empresas B2B
 * 2. Google Maps Places (direto, /maps/api/place/...) — Negócios locais
 * 3. CSV — importação em massa a partir de arquivo no servidor
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type MotorGarimpo = "APOLLO" | "GOOGLE_MAPS_PLACES" | "CSV";

export interface LeadGarimpado {
	id: string;
	nome: string;
	razaoSocial?: string;
	dominio?: string;
	telefone?: string;
	temTelefone: boolean;
	endereco?: string;
	cidade: string;
	estado: string;
	setor?: string;
	rating?: number;
	reviewsCount?: number;
	porteFuncionarios?: string;
	motor: MotorGarimpo;
	selected: boolean;
}

/** Input da server function de garimpo (dispatch por motor). */
export interface GarimpoServerInput {
	motor: MotorGarimpo;
	tags?: string[];
	localizacaoApollo?: string;
	perPage?: number;
	/** Apenas para GOOGLE_MAPS_PLACES — termo de busca (Place Text Search) */
	mapsKeyword?: string;
	/** Apenas para GOOGLE_MAPS_PLACES — location legível (ex: "Ribeirão Preto, SP, Brasil") */
	googleLocation?: string;
	/** Apenas para GOOGLE_MAPS_PLACES — center em lat,lng (override do fallback) */
	googleCenterLatLng?: string;
	/** Apenas para GOOGLE_MAPS_PLACES — raio em metros (default 10000) */
	googleRadius?: number;
	/** Apenas para GOOGLE_MAPS_PLACES — máximo de resultados (default 15, máx 60) */
	googleMaxResults?: number;
}

export interface GarimpoServerResponse {
	success: boolean;
	isMock: boolean;
	motor: MotorGarimpo;
	leads: LeadGarimpado[];
	total: number;
	costEstimate?: string;
	message?: string;
	error?: string;
}

/**
 * Server function chamável pelo client (RPC). O handler é removido do
 * bundle do client; a lógica real fica em `./aisa.server` (import dinâmico,
 * só resolve no servidor — nunca importe `*.server.*` direto em rotas).
 */
export const executarGarimpoServerFn = createServerFn({ method: "POST" })
	.validator((data: GarimpoServerInput) => data)
	.handler(async ({ data }): Promise<GarimpoServerResponse> => {
		const { executarGarimpo } = await import("./aisa.server");
		return executarGarimpo(data);
	});

export interface ApolloSearchParams {
	palavrasChave: string[];
	localizacao: string; // Ex: "Ribeirão Preto, São Paulo, Brazil"
	page?: number;
	perPage?: number;
}

/**
 * Normaliza a resposta bruta do Apollo (mixed_companies/search) para a interface LeadGarimpado
 */
export function normalizarApolloOrganizacao(
	org: any,
	index: number,
): LeadGarimpado {
	const telefone = org.phone || org.primary_phone?.number || undefined;
	const temTelefone = Boolean(telefone && telefone.trim().length >= 8);

	return {
		id: `apollo-${org.id || index + 1}-${Date.now()}`,
		nome: org.name || "Empresa sem nome",
		razaoSocial: org.legal_name || org.name,
		dominio: org.primary_domain || org.website_url,
		telefone,
		temTelefone,
		endereco: org.raw_address || org.street_address,
		cidade: org.city || "Ribeirão Preto",
		estado: org.state || "SP",
		setor: org.industry || org.subindustries?.[0] || "B2B Corporativo",
		porteFuncionarios: org.estimated_num_employees
			? `${org.estimated_num_employees} funcionários`
			: undefined,
		motor: "APOLLO",
		selected: temTelefone,
	};
}

/**
 * Monta o payload de busca para o Apollo
 */
export function buildApolloPayload(params: ApolloSearchParams) {
	const tags = params.palavrasChave.filter((t) => t.trim().length > 0);
	const payload: Record<string, any> = {
		organization_locations: [params.localizacao],
		page: params.page ?? 1,
		per_page: params.perPage ?? 15,
	};

	if (tags.length > 0) {
		payload.q_organization_keyword_tags = tags;
	}

	return payload;
}

/**
 * Recupera a chave da API AIsa a partir das variáveis de ambiente (.env)
 */
export function getAisaApiKey(): string {
	if (
		typeof import.meta !== "undefined" &&
		import.meta.env?.VITE_AISA_API_KEY
	) {
		return String(import.meta.env.VITE_AISA_API_KEY).trim();
	}
	if (typeof process !== "undefined" && process.env?.AISA_API_KEY) {
		return String(process.env.AISA_API_KEY).trim();
	}
	return "";
}

export function getGoogleMapsApiKeyPublic(): string {
	if (typeof process !== "undefined" && process.env?.GOOGLE_MAPS_API_KEY) {
		return String(process.env.GOOGLE_MAPS_API_KEY).trim();
	}
	return "";
}

// ==========================================================================
// Importação de garimpados → Lead (persistência no banco)
// ==========================================================================

const garimpadoImportRowSchema = z.object({
	nome: z.string().min(1),
	razaoSocial: z.string().nullable().optional(),
	dominio: z.string().nullable().optional(),
	telefone: z.string().nullable().optional(),
	endereco: z.string().nullable().optional(),
	cidade: z.string().nullable().optional(),
	estado: z.string().nullable().optional(),
	setor: z.string().nullable().optional(),
	porteFuncionarios: z.string().nullable().optional(),
	motor: z.enum(["APOLLO", "GOOGLE_MAPS_PLACES", "CSV"]),
});

export type GarimpadoImportRow = z.infer<typeof garimpadoImportRowSchema>;

export interface GarimpoImportResult {
	importados: number;
	atualizados: number;
	erros: Array<{ nome: string; motivo: string }>;
}

/**
 * Persiste os leads garimpados (Apollo / Google Maps) na tabela Lead.
 * Dedup: telefone normalizado → nome+cidade. Existe → atualiza,
 * não existe → cria com origem "MAPS" e etapa NOVO.
 */
export const importarGarimpadosServerFn = createServerFn({ method: "POST" })
	.validator(
		z.object({ leads: z.array(garimpadoImportRowSchema).min(1).max(500) }),
	)
	.handler(async ({ data }): Promise<GarimpoImportResult> => {
		const { importarGarimpados } = await import("./aisa.server");
		return importarGarimpados(data.leads);
	});
