// ==========================================================================
// csv-import.server.ts — lógica 100% servidor (fs + prisma).
// NUNCA importar este arquivo de rotas/componentes (import protection).
// O client chama via server functions definidas em `./csv-import`.
// ==========================================================================

import {
	type CsvDiscoInfo,
	type CsvImportErro,
	type CsvLeadRow,
	type CsvLoteResult,
	normalizarLinhaCsv,
	parsearCsv,
} from "./csv";

const DEFAULT_CSV_PATH = "/home/kingdev/Documentos/csv.csv";

function resolveCsvPath(): string {
	const envPath = process.env.LEAD_GENERATOR_CSV_PATH?.trim();
	return envPath ? envPath : DEFAULT_CSV_PATH;
}

/**
 * Núcleo do import: para cada linha, verifica se o lead já existe no banco
 * (dedup por telefone normalizado → e-mail). Se existir, atualiza;
 * se não existir, cria. Retorna contadores do lote.
 *
 * O `prisma` é carregado via dynamic import para NUNCA entrar no
 * bundle do client.
 */
export async function processarLinhasCsv(
	linhas: CsvLeadRow[],
): Promise<CsvLoteResult> {
	const { prisma } = await import("#/db");

	let importados = 0;
	let atualizados = 0;
	const erros: CsvImportErro[] = [];

	for (const row of linhas) {
		const lead = normalizarLinhaCsv(row);
		try {
			const existente =
				(lead.telefoneNorm
					? await prisma.lead.findFirst({
							where: { telefoneNorm: lead.telefoneNorm },
						})
					: null) ??
				(lead.email
					? await prisma.lead.findFirst({
							where: { emails: { contains: `"${lead.email}"` } },
						})
					: null);

			if (existente) {
				await prisma.lead.update({
					where: { id: existente.id },
					data: {
						nome: lead.nome,
						razaoSocial: lead.razaoSocial,
						emails: lead.email
							? JSON.stringify([lead.email])
							: existente.emails,
						telefone: lead.telefone ?? existente.telefone,
						telefoneNorm: lead.telefoneNorm ?? existente.telefoneNorm,
					},
				});
				atualizados += 1;
			} else {
				await prisma.lead.create({
					data: {
						nome: lead.nome,
						razaoSocial: lead.razaoSocial,
						emails: lead.email ? JSON.stringify([lead.email]) : null,
						telefone: lead.telefone,
						telefoneNorm: lead.telefoneNorm,
						origem: "CSV",
						etapaFunil: "NOVO",
					},
				});
				importados += 1;
			}
		} catch (err: any) {
			erros.push({
				linha: row.linha,
				razao_social: row.razao_social,
				motivo: `Falha ao persistir: ${err.message ?? String(err)}`,
			});
		}
	}

	return { importados, atualizados, erros };
}

/**
 * Lê e faz parse do CSV no disco (caminho fixo ou LEAD_GENERATOR_CSV_PATH).
 * Helper interno — re-lê o arquivo a cada chamada (stateless).
 */
async function lerCsvDisco(): Promise<
	| { ok: true; filePath: string; fileSize: number; linhas: CsvLeadRow[] }
	| { ok: false; filePath: string; fileSize?: number; motivo: string }
> {
	const filePath = resolveCsvPath();

	const [{ existsSync, statSync }, { readFile }] = await Promise.all([
		import("node:fs"),
		import("node:fs/promises"),
	]);

	if (!existsSync(filePath)) {
		return {
			ok: false,
			filePath,
			motivo: `Arquivo não encontrado em ${filePath}. Defina LEAD_GENERATOR_CSV_PATH para apontar para outro caminho, ou crie o arquivo.`,
		};
	}

	const stats = statSync(filePath);
	if (!stats.isFile()) {
		return {
			ok: false,
			filePath,
			motivo: "Caminho não aponta para um arquivo regular",
		};
	}

	const conteudo = await readFile(filePath, "utf-8");
	const parse = parsearCsv(conteudo);
	if (!parse.ok) {
		return {
			ok: false,
			filePath,
			fileSize: stats.size,
			motivo: parse.erros[0]?.motivo ?? "CSV malformado",
		};
	}

	return { ok: true, filePath, fileSize: stats.size, linhas: parse.linhas };
}

/**
 * Info do CSV no disco para o preview do client (antes de importar).
 */
export async function lerInfoCsvDisco(): Promise<CsvDiscoInfo> {
	const r = await lerCsvDisco();
	if (!r.ok) {
		return {
			ok: false,
			filePath: r.filePath,
			fileSize: r.fileSize,
			totalLinhas: 0,
			motivo: r.motivo,
		};
	}
	return {
		ok: true,
		filePath: r.filePath,
		fileSize: r.fileSize,
		totalLinhas: r.linhas.length,
	};
}

/**
 * Importa um lote [offset, offset+limit) do CSV em disco.
 * O client chama em loop para ter barra de progresso real.
 */
export async function importarLoteCsvDisco(
	offset: number,
	limit: number,
): Promise<CsvLoteResult> {
	const r = await lerCsvDisco();
	if (!r.ok) {
		return {
			importados: 0,
			atualizados: 0,
			erros: [{ linha: 0, razao_social: "", motivo: r.motivo }],
		};
	}
	return processarLinhasCsv(r.linhas.slice(offset, offset + limit));
}

/**
 * Importação one-shot do CSV em disco (mantida para uso interno/scripts).
 */
export async function importarCsvDoDisco() {
	const r = await lerCsvDisco();
	if (!r.ok) {
		return {
			success: false as const,
			filePath: r.filePath,
			fileSize: r.fileSize,
			totalLinhas: 0,
			importados: 0,
			atualizados: 0,
			erros: [{ linha: 0, razao_social: "", motivo: r.motivo }],
			message: r.motivo,
		};
	}
	const lote = await processarLinhasCsv(r.linhas);
	return {
		success: true as const,
		filePath: r.filePath,
		fileSize: r.fileSize,
		totalLinhas: r.linhas.length,
		...lote,
		message: `${lote.importados} importados, ${lote.atualizados} atualizados, ${lote.erros.length} erro(s)`,
	};
}
