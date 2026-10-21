// ==========================================================================
// lead_generator — integracao.ts
// --------------------------------------------------------------------------
// ConfiguracaoIntegracao (singleton id=1): chaves de API gerenciáveis em
// Configurações → Integrações. As server functions de integração leem daqui
// (ver ./lib/integracao.server.ts).
//
// SEGURANÇA: as chaves NUNCA são devolvidas em claro. O DTO traz apenas
// `definida: boolean` + prévia mascarada (ex: sk-aisa…7Ict).
// ==========================================================================

import { createHash } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import {
	getCookie,
	getRequestHeader,
	getRequestIP,
} from "@tanstack/react-start/server";
import { z } from "zod";

const SESSION_COOKIE_NAME = "lead_generator_session";

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

export interface IntegracaoConfigDTO {
	aisaDefinida: boolean;
	aisaMascarada: string | null;
	googleMapsDefinida: boolean;
	googleMapsMascarada: string | null;
	geminiDefinida: boolean;
	geminiMascarada: string | null;
	geminiModelo: string;
	geminiPermitirPago: boolean;
	openRouterDefinida: boolean;
	openRouterMascarada: string | null;
	openRouterModelo: string;
	smtpHost: string;
	smtpPorta: number;
	smtpUsuario: string;
	smtpSenhaDefinida: boolean;
}

/** Prévia segura da chave: primeiros 8 + ••• + últimos 4. Nunca o valor real. */
function mascararChave(valor: string | null): string | null {
	const v = (valor ?? "").trim();
	if (v.length === 0) return null;
	if (v.length <= 12) return `••••${v.slice(-4)}`;
	return `${v.slice(0, 8)}•••${v.slice(-4)}`;
}

interface IntegracaoRow {
	aisaApiKey: string | null;
	googleMapsApiKey: string | null;
	geminiApiKey: string | null;
	geminiModelo: string;
	geminiPermitirPago: boolean;
	openRouterApiKey: string | null;
	openRouterModelo: string | null;
	smtpHost: string | null;
	smtpPorta: number;
	smtpUsuario: string | null;
	smtpSenha: string | null;
}

function toDTO(row: IntegracaoRow): IntegracaoConfigDTO {
	return {
		aisaDefinida: (row.aisaApiKey ?? "").trim() !== "",
		aisaMascarada: mascararChave(row.aisaApiKey),
		googleMapsDefinida: (row.googleMapsApiKey ?? "").trim() !== "",
		googleMapsMascarada: mascararChave(row.googleMapsApiKey),
		geminiDefinida: (row.geminiApiKey ?? "").trim() !== "",
		geminiMascarada: mascararChave(row.geminiApiKey),
		geminiModelo: row.geminiModelo ?? "",
		geminiPermitirPago: row.geminiPermitirPago ?? false,
		openRouterDefinida: (row.openRouterApiKey ?? "").trim() !== "",
		openRouterMascarada: mascararChave(row.openRouterApiKey),
		openRouterModelo: row.openRouterModelo ?? "",
		smtpHost: row.smtpHost ?? "",
		smtpPorta: row.smtpPorta ?? 587,
		smtpUsuario: row.smtpUsuario ?? "",
		smtpSenhaDefinida: (row.smtpSenha ?? "").trim() !== "",
	};
}

export const getIntegracaoConfigServerFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<{ config: IntegracaoConfigDTO }> => {
	await requireAuth();
	const { prisma } = await import("#/db");
	const row =
		(await prisma.configuracaoIntegracao.findUnique({ where: { id: 1 } })) ??
		(await prisma.configuracaoIntegracao.create({ data: { id: 1 } }));
	return { config: toDTO(row) };
});

const updateSchema = z.object({
	aisaApiKey: z.string().trim().max(500).optional(),
	googleMapsApiKey: z.string().trim().max(500).optional(),
	geminiApiKey: z.string().trim().max(500).optional(),
	geminiModelo: z.string().trim().max(80).optional(),
	geminiPermitirPago: z.boolean().optional(),
	openRouterApiKey: z.string().trim().max(500).optional(),
	openRouterModelo: z.string().trim().max(80).optional(),
	smtpHost: z.string().trim().max(300).optional(),
	smtpPorta: z.number().int().min(1).max(65535).optional(),
	smtpUsuario: z.string().trim().max(300).optional(),
	smtpSenha: z.string().trim().max(500).optional(),
});

/** Campos que guardam segredo — string vazia significa "não alterar". */
const CAMPOS_SECRETO = new Set([
	"aisaApiKey",
	"googleMapsApiKey",
	"geminiApiKey",
	"openRouterApiKey",
	"smtpSenha",
]);

/** Snapshot mascarado para o AuditLog — segredos nunca entram em claro. */
function mascararSnapshot(row: IntegracaoRow) {
	return {
		aisaApiKey: mascararChave(row.aisaApiKey),
		googleMapsApiKey: mascararChave(row.googleMapsApiKey),
		geminiApiKey: mascararChave(row.geminiApiKey),
		geminiModelo: row.geminiModelo,
		geminiPermitirPago: row.geminiPermitirPago ?? false,
		openRouterApiKey: mascararChave(row.openRouterApiKey),
		openRouterModelo: row.openRouterModelo,
		smtpHost: row.smtpHost,
		smtpPorta: row.smtpPorta,
		smtpUsuario: row.smtpUsuario,
		smtpSenha: mascararChave(row.smtpSenha),
	};
}

export const updateIntegracaoConfigServerFn = createServerFn({
	method: "POST",
})
	.validator(updateSchema)
	.handler(async ({ data }): Promise<{ config: IntegracaoConfigDTO }> => {
		const autorId = await requireAuth();
		const { prisma } = await import("#/db");
		const ip = getRequestIP() ?? null;
		const userAgent = getRequestHeader("user-agent") ?? null;

		const patch: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(data)) {
			if (v === undefined) continue;
			if (CAMPOS_SECRETO.has(k) && (v as string).trim() === "") continue;
			patch[k] = v;
		}

		const antes = await prisma.configuracaoIntegracao.findUnique({
			where: { id: 1 },
		});
		const row = await prisma.configuracaoIntegracao.upsert({
			where: { id: 1 },
			create: { id: 1, ...patch },
			update: patch,
		});

		await prisma.auditLog.create({
			data: {
				autorId,
				acao: "integracao.update",
				entidade: "ConfiguracaoIntegracao",
				entidadeId: 1,
				valorAnterior: antes
					? JSON.stringify(mascararSnapshot(antes as IntegracaoRow))
					: null,
				valorNovo: JSON.stringify(mascararSnapshot(row as IntegracaoRow)),
				ip,
				userAgent,
			},
		});

		return { config: toDTO(row) };
	});

// ──────────────────────────────────────────────────────────────────────
// AuditLog — leitura para a aba "Logs de auditoria" da tela de Configurações
// ──────────────────────────────────────────────────────────────────────

export interface AuditLogDTO {
	id: number;
	acao: string;
	entidade: string;
	entidadeId: number | null;
	valorAnterior: string | null;
	valorNovo: string | null;
	justificativa: string | null;
	ip: string | null;
	createdAt: string;
	autorNome: string | null;
}

const auditFiltrosSchema = z.object({
	entidade: z.string().trim().max(80).optional(),
	acao: z.string().trim().max(80).optional(),
	cursor: z.coerce.number().int().positive().optional(),
});

export const getAuditLogServerFn = createServerFn({ method: "GET" })
	.validator(auditFiltrosSchema.optional())
	.handler(
		async ({
			data,
		}): Promise<{ logs: AuditLogDTO[]; nextCursor: number | null }> => {
			await requireAuth();
			const { prisma } = await import("#/db");
			const take = 25;

			const logs = await prisma.auditLog.findMany({
				where: {
					...(data?.entidade ? { entidade: data.entidade } : {}),
					...(data?.acao ? { acao: data.acao } : {}),
				},
				orderBy: { createdAt: "desc" },
				take: take + 1,
				...(data?.cursor ? { cursor: { id: data.cursor }, skip: 1 } : {}),
				include: { autor: { select: { nome: true } } },
			});

			const hasMore = logs.length > take;
			const page = logs.slice(0, take);
			return {
				logs: page.map((l) => ({
					id: l.id,
					acao: l.acao,
					entidade: l.entidade,
					entidadeId: l.entidadeId,
					valorAnterior: l.valorAnterior,
					valorNovo: l.valorNovo,
					justificativa: l.justificativa,
					ip: l.ip,
					createdAt: l.createdAt.toISOString(),
					autorNome: l.autor?.nome ?? null,
				})),
				nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
			};
		},
	);

// ──────────────────────────────────────────────────────────────────────
// Teste de conexão por provedor (chamada barata antes de confiar na chave)
// ──────────────────────────────────────────────────────────────────────

const testarSchema = z.object({
	provedor: z.enum(["AISA", "GOOGLE_MAPS", "GEMINI", "OPENROUTER", "SMTP"]),
});

export const testarIntegracaoServerFn = createServerFn({ method: "POST" })
	.validator(testarSchema)
	.handler(async ({ data }): Promise<{ ok: boolean; mensagem: string }> => {
		await requireAuth();
		const { getIntegracaoCredenciais, resolverChave } = await import(
			"#/lib/integracao.server"
		);
		const creds = await getIntegracaoCredenciais();

		switch (data.provedor) {
			case "AISA": {
				const apiKey = resolverChave(
					creds.aisaApiKey,
					process.env.AISA_API_KEY,
				);
				if (!apiKey) return { ok: false, mensagem: "Chave não definida." };
				const res = await fetch(
					"https://api.aisa.one/apis/v1/apollo/mixed_companies/search",
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${apiKey}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							organization_locations: ["Ribeirão Preto, São Paulo, Brazil"],
							page: 1,
							per_page: 1,
						}),
					},
				);
				return res.ok
					? { ok: true, mensagem: "AIsa respondeu 200. Chave válida." }
					: { ok: false, mensagem: `AIsa respondeu HTTP ${res.status}.` };
			}

			case "GOOGLE_MAPS": {
				const apiKey = resolverChave(
					creds.googleMapsApiKey,
					process.env.GOOGLE_MAPS_API_KEY,
				);
				if (!apiKey) return { ok: false, mensagem: "Chave não definida." };
				const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=padaria&key=${encodeURIComponent(apiKey)}`;
				const res = await fetch(url);
				const json = await res.json().catch(() => ({}));
				const status = json.status ?? `HTTP ${res.status}`;
				return status === "OK" || status === "ZERO_RESULTS"
					? { ok: true, mensagem: `Google Maps: ${status}. Chave válida.` }
					: { ok: false, mensagem: `Google Maps: ${status}.` };
			}

			case "GEMINI": {
				const apiKey = resolverChave(
					creds.geminiApiKey,
					process.env.GEMINI_API_KEY,
				);
				if (!apiKey) return { ok: false, mensagem: "Chave não definida." };
				// Testa no modelo EFETIVO (config do Operador, senão o gratuito) —
				// ping num modelo pago falharia em chave do tier free.
				const modelo =
					resolverChave(creds.geminiModelo, process.env.GEMINI_MODEL) ||
					"gemini-3.5-flash-lite";
				const res = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							contents: [{ parts: [{ text: "ping" }] }],
						}),
					},
				);
				return res.ok
					? {
							ok: true,
							mensagem: `Gemini respondeu 200 (${modelo}). Chave válida.`,
						}
					: {
							ok: false,
							mensagem: `Gemini respondeu HTTP ${res.status} (${modelo}).`,
						};
			}

			case "OPENROUTER": {
				const apiKey = resolverChave(
					creds.openRouterApiKey,
					process.env.OPENROUTER_API_KEY,
				);
				if (!apiKey) return { ok: false, mensagem: "Chave não definida." };
				const res = await fetch("https://openrouter.ai/api/v1/models", {
					headers: { Authorization: `Bearer ${apiKey}` },
				});
				return res.ok
					? { ok: true, mensagem: "OpenRouter respondeu 200. Chave válida." }
					: { ok: false, mensagem: `OpenRouter respondeu HTTP ${res.status}.` };
			}

			case "SMTP": {
				const host = (creds.smtpHost ?? "").trim();
				const porta = creds.smtpPorta;
				if (!host || !porta) {
					return {
						ok: false,
						mensagem: "Informe host e porta para validar o SMTP.",
					};
				}
				return {
					ok: true,
					mensagem: `SMTP configurado: ${host}:${porta} (envio testado só ao disparar e-mail).`,
				};
			}
		}
	});
