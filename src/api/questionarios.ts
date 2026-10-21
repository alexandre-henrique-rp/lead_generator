// ==========================================================================
// lead_generator — questionarios.ts (levantamento de requisitos por projeto)
// Operador gera link → cliente responde (texto + links + anexos) → link morre.
// Perguntas padrão (template) + suplementares (operador).
// ==========================================================================

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { createHash, randomBytes } from "node:crypto";
import {
	QUESTIONARIO_TEMPLATE,
	type PerguntaTemplate,
} from "#/lib/questionario-template";

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

function novoToken(): string {
	return randomBytes(24).toString("hex");
}

// ──────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────

export interface QuestionarioRespostas {
	respostas: Record<string, string>;
	suplementares: { pergunta: string; resposta: string }[];
	duvidas: { pergunta: string; resposta: string }[];
	links: string[];
}

export interface ArquivoDTO {
	uuid: string;
	originalName: string;
	url: string;
	mimeType: string;
	tipo: string;
	size: number;
}

export interface QuestionarioDTO {
	uuid: string;
	token: string;
	status: string;
	perguntasSuplementares: string[];
	respostas: QuestionarioRespostas | null;
	clienteNome: string | null;
	clienteEmail: string | null;
	clienteTelefone: string | null;
	respondidoEm: string | null;
	createdAt: string;
	arquivos: ArquivoDTO[];
}

export interface QuestionarioPublicoDTO {
	token: string;
	status: string;
	projetoNome: string;
	perguntasPadrao: PerguntaTemplate[];
	perguntasSuplementares: string[];
}

function arquivoToDTO(a: any): ArquivoDTO {
	return {
		uuid: a.uuid,
		originalName: a.originalName,
		url: a.url,
		mimeType: a.mimeType,
		tipo: a.tipo,
		size: a.size,
	};
}

function questionarioToDTO(q: any): QuestionarioDTO {
	return {
		uuid: q.uuid,
		token: q.token,
		status: q.status,
		perguntasSuplementares: safeParseArray(q.perguntasSuplementares),
		respostas: q.respostasJson ? JSON.parse(q.respostasJson) : null,
		clienteNome: q.clienteNome ?? null,
		clienteEmail: q.clienteEmail ?? null,
		clienteTelefone: q.clienteTelefone ?? null,
		respondidoEm: q.respondidoEm ? q.respondidoEm.toISOString() : null,
		createdAt: q.createdAt.toISOString(),
		arquivos: (q.arquivos ?? []).map(arquivoToDTO),
	};
}

function safeParseArray(s: string | null | undefined): string[] {
	if (!s) return [];
	try {
		const v = JSON.parse(s);
		return Array.isArray(v) ? v : [];
	} catch {
		return [];
	}
}

// ──────────────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────────────

const projetoUuidSchema = z.object({ projetoUuid: z.string().min(1) });
const tokenSchema = z.object({ token: z.string().min(1) });
const suplementaresSchema = z.object({
	questionarioUuid: z.string().min(1),
	perguntas: z.array(z.string().trim().min(1).max(500)),
});
const responderSchema = z.object({
	token: z.string().min(1),
	respostas: z.record(z.string(), z.string().max(5000)),
	suplementares: z
		.array(z.object({ pergunta: z.string(), resposta: z.string().max(5000) }))
		.optional(),
	duvidas: z
		.array(
			z.object({
				pergunta: z.string().max(500),
				resposta: z.string().max(5000),
			}),
		)
		.optional(),
	links: z.array(z.string().trim().max(1000)).optional(),
	clienteNome: z.string().trim().max(160).optional(),
	clienteEmail: z.string().trim().max(160).optional(),
	clienteTelefone: z.string().trim().max(40).optional(),
});

// ──────────────────────────────────────────────────────────────────────
// Operador
// ──────────────────────────────────────────────────────────────────────

/** Lista todos os questionários do projeto (principal + complementares). */
export const listQuestionariosServerFn = createServerFn({ method: "GET" })
	.validator(projetoUuidSchema)
	.handler(
		async ({
			data: { projetoUuid },
		}): Promise<{ questionarios: QuestionarioDTO[] }> => {
			await requireAuth();
			const { prisma } = await import("#/db");
			const projeto = await prisma.projeto.findUnique({
				where: { uuid: projetoUuid },
				select: { id: true },
			});
			if (!projeto) return { questionarios: [] };

			const rows = await prisma.questionario.findMany({
				where: { projetoId: projeto.id },
				orderBy: { createdAt: "asc" },
				include: { arquivos: true },
			});
			return { questionarios: rows.map(questionarioToDTO) };
		},
	);

/** Gera o link do questionário (cria se não existir). */
export const gerarQuestionarioServerFn = createServerFn({ method: "POST" })
	.validator(projetoUuidSchema)
	.handler(
		async ({
			data: { projetoUuid },
		}): Promise<{ questionario: QuestionarioDTO }> => {
			await requireAuth();
			const { prisma } = await import("#/db");
			const projeto = await prisma.projeto.findUnique({
				where: { uuid: projetoUuid },
				select: { id: true },
			});
			if (!projeto) throw new Error("Projeto não encontrado");

			const existente = await prisma.questionario.findFirst({
				where: { projetoId: projeto.id, status: "AGUARDANDO" },
				include: { arquivos: true },
			});
			if (existente) return { questionario: questionarioToDTO(existente) };

			const q = await prisma.questionario.create({
				data: { projetoId: projeto.id, token: novoToken() },
				include: { arquivos: true },
			});
			return { questionario: questionarioToDTO(q) };
		},
	);

/** Atualiza as perguntas suplementares do questionário. */
export const salvarSuplementaresServerFn = createServerFn({ method: "POST" })
	.validator(suplementaresSchema)
	.handler(async ({ data }): Promise<{ ok: true }> => {
		await requireAuth();
		const { prisma } = await import("#/db");
		await prisma.questionario.update({
			where: { uuid: data.questionarioUuid },
			data: { perguntasSuplementares: JSON.stringify(data.perguntas) },
		});
		return { ok: true };
	});

// ──────────────────────────────────────────────────────────────────────
// Público (cliente, sem auth)
// ──────────────────────────────────────────────────────────────────────

export const getQuestionarioPublicoServerFn = createServerFn({ method: "GET" })
	.validator(tokenSchema)
	.handler(
		async ({
			data: { token },
		}): Promise<{ questionario: QuestionarioPublicoDTO | null }> => {
			const { prisma } = await import("#/db");
			const q = await prisma.questionario.findUnique({
				where: { token },
				include: { projeto: { select: { nome: true } } },
			});
			if (!q) return { questionario: null };
			return {
				questionario: {
					token: q.token,
					status: q.status,
					projetoNome: q.projeto.nome,
					perguntasPadrao: QUESTIONARIO_TEMPLATE,
					perguntasSuplementares: safeParseArray(q.perguntasSuplementares),
				},
			};
		},
	);

export const responderQuestionarioServerFn = createServerFn({ method: "POST" })
	.validator(responderSchema)
	.handler(async ({ data }): Promise<{ ok: true }> => {
		const { prisma } = await import("#/db");
		const q = await prisma.questionario.findUnique({
			where: { token: data.token },
		});
		if (!q) throw new Error("Questionário não encontrado");
		if (q.status === "RESPONDIDO") {
			throw new Error("Este questionário já foi respondido.");
		}

		const respostas: QuestionarioRespostas = {
			respostas: data.respostas,
			suplementares: data.suplementares ?? [],
			duvidas: data.duvidas ?? [],
			links: (data.links ?? []).filter((l) => l.trim() !== ""),
		};

		await prisma.questionario.update({
			where: { id: q.id },
			data: {
				status: "RESPONDIDO",
				respostasJson: JSON.stringify(respostas),
				clienteNome: data.clienteNome ?? null,
				clienteEmail: data.clienteEmail ?? null,
				clienteTelefone: data.clienteTelefone ?? null,
				respondidoEm: new Date(),
				linkDesabilitadoEm: new Date(),
			},
		});
		return { ok: true };
	});
