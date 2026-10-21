// ==========================================================================
// lead_generator — storage.server.ts
// Abstração de storage: usa S3-compatível (RustFS) se StorageConfig.habilitado
// no banco; senão faz fallback para o filesystem local (pasta uploads/).
// Objetos são públicos (política public-read) → URL direta sem expiração.
// ==========================================================================

import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface StorageResult {
	storageTipo: "S3" | "LOCAL";
	bucket: string | null;
	storageKey: string;
	url: string;
	hash: string;
	size: number;
}

function extOf(name: string): string {
	const i = name.lastIndexOf(".");
	return i >= 0 ? name.slice(i + 1).toLowerCase() : "bin";
}

function tipoDe(mime: string): "IMAGEM" | "VIDEO" | "DOCUMENTO" {
	if (mime.startsWith("image/")) return "IMAGEM";
	if (mime.startsWith("video/")) return "VIDEO";
	return "DOCUMENTO";
}

/** Nome da pasta/sub-bucket por projeto. */
function slugProjeto(projetoUuid: string): string {
	return `projeto-${projetoUuid}`;
}

async function carregarConfig() {
	const { prisma } = await import("#/db");
	const row =
		(await prisma.storageConfig.findUnique({ where: { id: 1 } })) ??
		(await prisma.storageConfig.create({ data: { id: 1 } }));
	return row;
}

/**
 * Faz upload de um arquivo. Decide S3 vs local conforme StorageConfig.
 * `pasta` é a subpasta/categoria (ex.: "questionario").
 */
export async function uploadArquivo(params: {
	buffer: Buffer;
	originalName: string;
	mimeType: string;
	projetoUuid: string;
	pasta: string;
}): Promise<StorageResult & { tipo: "IMAGEM" | "VIDEO" | "DOCUMENTO"; ext: string }> {
	const cfg = await carregarConfig();
	const ext = extOf(params.originalName);
	const hash = createHash("sha256").update(params.buffer).digest("hex");
	const nomeUnico = `${randomBytes(12).toString("hex")}.${ext}`;
	const tipo = tipoDe(params.mimeType);
	const size = params.buffer.length;

	const configurado =
		cfg.habilitado &&
		cfg.endpoint.trim() !== "" &&
		cfg.accessKey.trim() !== "" &&
		cfg.secretKey.trim() !== "";

	if (configurado) {
		const bucket = cfg.bucketPorProjeto
			? slugProjeto(params.projetoUuid)
			: cfg.bucketPrincipal || "uploads";
		const key = cfg.bucketPorProjeto
			? `${params.pasta}/${nomeUnico}`
			: `${slugProjeto(params.projetoUuid)}/${params.pasta}/${nomeUnico}`;

		const {
			S3Client,
			PutObjectCommand,
			CreateBucketCommand,
			HeadBucketCommand,
		} = await import("@aws-sdk/client-s3");

		const client = new S3Client({
			endpoint: cfg.endpoint,
			region: cfg.region || "us-east-1",
			forcePathStyle: cfg.forcePathStyle,
			credentials: {
				accessKeyId: cfg.accessKey,
				secretAccessKey: cfg.secretKey,
			},
		});

		// Garante o bucket (cria se não existir).
		try {
			await client.send(new HeadBucketCommand({ Bucket: bucket }));
		} catch {
			try {
				await client.send(new CreateBucketCommand({ Bucket: bucket }));
			} catch {
				// Se não conseguir criar (ex.: já existe por corrida), segue.
			}
		}

		await client.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: params.buffer,
				ContentType: params.mimeType,
				ACL: (cfg.politica as never) || ("public-read" as never),
			}),
		);

		const base = (cfg.publicBaseUrl || cfg.endpoint).replace(/\/$/, "");
		const url = `${base}/${bucket}/${key}`;

		return {
			storageTipo: "S3",
			bucket,
			storageKey: key,
			url,
			hash,
			size,
			tipo,
			ext,
		};
	}

	// ── Fallback filesystem local ──
	const subdir = join("uploads", slugProjeto(params.projetoUuid), params.pasta);
	const destDir = join(process.cwd(), "public", subdir);
	await mkdir(destDir, { recursive: true });
	await writeFile(join(destDir, nomeUnico), params.buffer);
	// Servido estaticamente a partir de /public → URL relativa pública.
	const url = `/${subdir}/${nomeUnico}`.replace(/\\/g, "/");

	return {
		storageTipo: "LOCAL",
		bucket: null,
		storageKey: join(subdir, nomeUnico).replace(/\\/g, "/"),
		url,
		hash,
		size,
		tipo,
		ext,
	};
}
