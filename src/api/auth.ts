// ==========================================================================
// King Ops — auth.ts (server functions de autenticação)
// --------------------------------------------------------------------------
// Regras do TanStack Start (import protection):
//   - SÓ exports `createServerFn` e types (TS strip-a).
//   - Helpers (bcrypt, session, crypto) ficam LOCAIS ao módulo.
//   - `prisma` carregado via dynamic import dentro dos handlers.
// ==========================================================================

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import {
	getCookie,
	setCookie,
	deleteCookie,
} from "@tanstack/react-start/server";
import { createHash, randomBytes } from "node:crypto";

// ==========================================================================
// Types (exportados, strip-áveis pelo TS)
// ==========================================================================

export type LoginResult =
	| { ok: true; usuario: { id: number; uuid: string; nome: string; email: string } }
	| { ok: false; error: "INVALID_CREDENTIALS" | "INACTIVE" | "USER_NOT_FOUND" };

export type SessionContext = {
	usuarioId: number;
	usuarioUuid: string;
	email: string;
	nome: string;
};

export type CurrentUserResponse = {
	user: { id: number; uuid: string; nome: string; email: string; telefone: string | null; cnpj: string | null } | null;
};

// ==========================================================================
// Helpers LOCAIS ao módulo
// ==========================================================================

const SESSION_COOKIE_NAME = "lead_generator_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias
const RESET_DURATION_MS = 1000 * 60 * 60; // 1h

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
	return randomBytes(32).toString("hex");
}

async function hashPassword(plain: string): Promise<string> {
	const bcrypt = await import("bcryptjs");
	return bcrypt.default.hash(plain, 12);
}

async function verifyPasswordBcrypt(
	plain: string,
	hash: string,
): Promise<boolean> {
	const bcrypt = await import("bcryptjs");
	return bcrypt.default.compare(plain, hash);
}

function setSessionCookie(token: string): void {
	setCookie(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: Math.floor(SESSION_DURATION_MS / 1000),
	});
}

function clearSessionCookie(): void {
	deleteCookie(SESSION_COOKIE_NAME);
}

function getSessionTokenFromCookie(): string | null {
	return getCookie(SESSION_COOKIE_NAME) ?? null;
}

async function loadSession(): Promise<SessionContext | null> {
	const token = getSessionTokenFromCookie();
	if (!token) return null;
	const tokenHash = hashToken(token);

	const { prisma } = await import("#/db");
	const sessao = await prisma.sessao.findUnique({
		where: { tokenHash },
		include: { usuario: true },
	});
	if (!sessao) return null;
	if (sessao.revokedAt) return null;
	if (sessao.expiresAt < new Date()) return null;
	if (!sessao.usuario.isActive) return null;

	return {
		usuarioId: sessao.usuarioId,
		usuarioUuid: sessao.usuario.uuid,
		email: sessao.usuario.email,
		nome: sessao.usuario.nome,
	};
}

// ==========================================================================
// Schemas de validação (zod — universal, OK no top level)
// ==========================================================================

const loginInputSchema = z.object({
	email: z.string().trim().toLowerCase().email("E-mail inválido").max(255),
	senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(128),
});

const esqueciSenhaSchema = z.object({
	email: z.string().trim().toLowerCase().email().max(255),
});

const resetSenhaSchema = z.object({
	token: z.string().min(10),
	novaSenha: z.string().min(6).max(128),
});

// ==========================================================================
// Server functions (EXPORTADAS)
// ==========================================================================

export const loginServerFn = createServerFn({ method: "POST" })
	.validator(loginInputSchema)
	.handler(async ({ data }): Promise<LoginResult> => {
		const { prisma } = await import("#/db");
		const usuario = await prisma.usuario.findUnique({
			where: { email: data.email },
		});

		if (!usuario) {
			// Não revela se o e-mail existe (mitigação de enumeração)
			return { ok: false, error: "INVALID_CREDENTIALS" };
		}

		if (!usuario.isActive) {
			return { ok: false, error: "INACTIVE" };
		}

		const senhaOk = await verifyPasswordBcrypt(data.senha, usuario.senhaHash);
		if (!senhaOk) {
			return { ok: false, error: "INVALID_CREDENTIALS" };
		}

		const token = generateToken();
		const tokenHash = hashToken(token);
		const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

		await prisma.sessao.create({
			data: {
				usuarioId: usuario.id,
				tokenHash,
				expiresAt,
			},
		});

		setSessionCookie(token);

		return {
			ok: true,
			usuario: {
				id: usuario.id,
				uuid: usuario.uuid,
				nome: usuario.nome,
				email: usuario.email,
			},
		};
	});

export const logoutServerFn = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ ok: true }> => {
		const token = getSessionTokenFromCookie();
		if (token) {
			const { prisma } = await import("#/db");
			await prisma.sessao.updateMany({
				where: { tokenHash: hashToken(token), revokedAt: null },
				data: { revokedAt: new Date() },
			});
		}
		clearSessionCookie();
		return { ok: true };
	},
);

export const getCurrentUserServerFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<CurrentUserResponse> => {
		const sessao = await loadSession();
		if (!sessao) return { user: null };

		const { prisma } = await import("#/db");
		const u = await prisma.usuario.findUnique({
			where: { id: sessao.usuarioId },
			select: {
				id: true,
				uuid: true,
				nome: true,
				email: true,
				telefone: true,
				cnpj: true,
			},
		});
		return { user: u };
	},
);

export const esqueciSenhaServerFn = createServerFn({ method: "POST" })
	.validator(esqueciSenhaSchema)
	.handler(async ({ data }): Promise<{ ok: true; tokenGerado: string }> => {
		// Em produção: enviar e-mail com o link. Aqui retornamos o token
		// para o Operador testar localmente.
		const { prisma } = await import("#/db");
		const usuario = await prisma.usuario.findUnique({
			where: { email: data.email },
		});

		if (!usuario || !usuario.isActive) {
			// Resposta genérica — não revela se o e-mail existe
			return { ok: true, tokenGerado: "" };
		}

		const token = generateToken();
		const tokenHash = hashToken(token);
		const expiresAt = new Date(Date.now() + RESET_DURATION_MS);

		await prisma.tokenResetSenha.create({
			data: {
				usuarioId: usuario.id,
				tokenHash,
				expiresAt,
			},
		});

		return { ok: true, tokenGerado: token };
	});

export const resetSenhaServerFn = createServerFn({ method: "POST" })
	.validator(resetSenhaSchema)
	.handler(
		async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
			const { prisma } = await import("#/db");
			const tokenHash = hashToken(data.token);
			const reset = await prisma.tokenResetSenha.findUnique({
				where: { tokenHash },
				include: { usuario: true },
			});

			if (!reset || reset.usadoEm || reset.expiresAt < new Date()) {
				return { ok: false, error: "Token inválido ou expirado" };
			}

			const novaHash = await hashPassword(data.novaSenha);

			await prisma.$transaction([
				prisma.usuario.update({
					where: { id: reset.usuarioId },
					data: { senhaHash: novaHash },
				}),
				prisma.tokenResetSenha.update({
					where: { id: reset.id },
					data: { usadoEm: new Date() },
				}),
				// invalida todas as sessões existentes
				prisma.sessao.updateMany({
					where: { usuarioId: reset.usuarioId, revokedAt: null },
					data: { revokedAt: new Date() },
				}),
			]);

			return { ok: true };
		},
	);
