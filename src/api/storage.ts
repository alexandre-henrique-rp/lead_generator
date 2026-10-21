// ==========================================================================
// lead_generator — storage.ts (StorageConfig no banco + upload de anexos)
// StorageConfig é editável na tela de Configurações. Upload do questionário
// é público (cliente anônimo), grava na tabela Arquivo.
// ==========================================================================

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { uploadArquivo as storagePut } from "#/lib/storage.server";

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

export interface StorageConfigDTO {
	habilitado: boolean;
	endpoint: string;
	region: string;
	accessKey: string;
	secretKeyDefinida: boolean; // não devolvemos o secret
	bucketPrincipal: string;
	bucketPorProjeto: boolean;
	forcePathStyle: boolean;
	publicBaseUrl: string;
	politica: string;
}

function toDTO(row: any): StorageConfigDTO {
	return {
		habilitado: row.habilitado,
		endpoint: row.endpoint,
		region: row.region,
		accessKey: row.accessKey,
		secretKeyDefinida: (row.secretKey ?? "").trim() !== "",
		bucketPrincipal: row.bucketPrincipal,
		bucketPorProjeto: row.bucketPorProjeto,
		forcePathStyle: row.forcePathStyle,
		publicBaseUrl: row.publicBaseUrl,
		politica: row.politica,
	};
}

export const getStorageConfigServerFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<{ config: StorageConfigDTO }> => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const row =
			(await prisma.storageConfig.findUnique({ where: { id: 1 } })) ??
			(await prisma.storageConfig.create({ data: { id: 1 } }));
		return { config: toDTO(row) };
	},
);

const updateSchema = z.object({
	habilitado: z.boolean().optional(),
	endpoint: z.string().trim().max(300).optional(),
	region: z.string().trim().max(60).optional(),
	accessKey: z.string().trim().max(300).optional(),
	secretKey: z.string().trim().max(500).optional(), // só atualiza se enviado
	bucketPrincipal: z.string().trim().max(120).optional(),
	bucketPorProjeto: z.boolean().optional(),
	forcePathStyle: z.boolean().optional(),
	publicBaseUrl: z.string().trim().max(300).optional(),
	politica: z.string().trim().max(60).optional(),
});

export const updateStorageConfigServerFn = createServerFn({ method: "POST" })
	.validator(updateSchema)
	.handler(async ({ data }): Promise<{ config: StorageConfigDTO }> => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const patch: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(data)) {
			if (v === undefined) continue;
			// secretKey vazio = não altera
			if (k === "secretKey" && (v as string).trim() === "") continue;
			patch[k] = v;
		}
		const row = await prisma.storageConfig.upsert({
			where: { id: 1 },
			create: { id: 1, ...patch },
			update: patch,
		});
		return { config: toDTO(row) };
	});

// ──────────────────────────────────────────────────────────────────────
// Upload público de anexo do questionário (cliente anônimo via token)
// ──────────────────────────────────────────────────────────────────────

const uploadSchema = z.object({
	token: z.string().min(1), // token do questionário
	fileName: z.string().min(1).max(260),
	mimeType: z.string().min(1).max(160),
	// conteúdo em base64 (data sem prefixo data:)
	base64: z.string().min(1),
});

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export const uploadAnexoQuestionarioServerFn = createServerFn({ method: "POST" })
	.validator(uploadSchema)
	.handler(
		async ({
			data,
		}): Promise<{ uuid: string; url: string; tipo: string }> => {
			const { prisma } = await import("#/db");
			const q = await prisma.questionario.findUnique({
				where: { token: data.token },
				include: { projeto: { select: { id: true, uuid: true } } },
			});
			if (!q) throw new Error("Questionário não encontrado");
			if (q.status === "RESPONDIDO") {
				throw new Error("Questionário já respondido.");
			}

			const buffer = Buffer.from(data.base64, "base64");
			if (buffer.length === 0) throw new Error("Arquivo vazio.");
			if (buffer.length > MAX_BYTES) {
				throw new Error("Arquivo acima de 10MB.");
			}

			const stored = await storagePut({
				buffer,
				originalName: data.fileName,
				mimeType: data.mimeType,
				projetoUuid: q.projeto.uuid,
				pasta: "questionario",
			});

			const arquivo = await prisma.arquivo.create({
				data: {
					originalName: data.fileName,
					storageKey: stored.storageKey,
					bucket: stored.bucket,
					url: stored.url,
					mimeType: data.mimeType,
					ext: stored.ext,
					size: stored.size,
					hash: stored.hash,
					tipo: stored.tipo,
					categoria: "ANEXO_QUESTIONARIO",
					storageTipo: stored.storageTipo,
					projetoId: q.projeto.id,
					questionarioId: q.id,
				},
			});

			return { uuid: arquivo.uuid, url: arquivo.url, tipo: arquivo.tipo };
		},
	);
