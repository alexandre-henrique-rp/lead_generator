// ==========================================================================
// King Ops — operador.ts (server functions do perfil do Operador)
// --------------------------------------------------------------------------
// Padrão .server.ts: só `createServerFn` + types exportados.
// ==========================================================================

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";

const SESSION_COOKIE_NAME = "lead_generator_session";

const updateMeSchema = z.object({
	nome: z.string().trim().min(2).max(120),
	telefone: z
		.string()
		.trim()
		.regex(/^[\d\s\-()+]*$/u, "Telefone contém caracteres inválidos")
		.max(20)
		.optional()
		.or(z.literal("")),
	cnpj: z
		.string()
		.trim()
		.regex(/^[\d./-]*$/u, "CNPJ contém caracteres inválidos")
		.max(18)
		.optional()
		.or(z.literal("")),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type MeResponse = {
	usuario: {
		id: number;
		uuid: string;
		nome: string;
		email: string;
		telefone: string | null;
		cnpj: string | null;
		createdAt: Date;
	} | null;
};

async function getOperadorIdFromSession(): Promise<number | null> {
	const token = getCookie(SESSION_COOKIE_NAME);
	if (!token) return null;
	const tokenHash = createHash("sha256").update(token).digest("hex");

	const { prisma } = await import("#/db");
	const sessao = await prisma.sessao.findUnique({ where: { tokenHash } });
	if (!sessao || sessao.revokedAt || sessao.expiresAt < new Date()) return null;
	return sessao.usuarioId;
}

export const getMeServerFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<MeResponse> => {
		const id = await getOperadorIdFromSession();
		if (!id) return { usuario: null };

		const { prisma } = await import("#/db");
		const u = await prisma.usuario.findUnique({
			where: { id },
			select: {
				id: true,
				uuid: true,
				nome: true,
				email: true,
				telefone: true,
				cnpj: true,
				createdAt: true,
			},
		});
		return { usuario: u };
	},
);

export const updateMeServerFn = createServerFn({ method: "POST" })
	.validator(updateMeSchema)
	.handler(async ({ data }): Promise<MeResponse> => {
		const id = await getOperadorIdFromSession();
		if (!id) return { usuario: null };

		const { prisma } = await import("#/db");
		const u = await prisma.usuario.update({
			where: { id },
			data: {
				nome: data.nome,
				telefone: data.telefone && data.telefone.length > 0 ? data.telefone : null,
				cnpj: data.cnpj && data.cnpj.length > 0 ? data.cnpj : null,
			},
			select: {
				id: true,
				uuid: true,
				nome: true,
				email: true,
				telefone: true,
				cnpj: true,
				createdAt: true,
			},
		});

		return { usuario: u };
	});
