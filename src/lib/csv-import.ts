// ==========================================================================
// csv-import.ts — bridge RPC chamável pelo client.
// A lógica real (fs/prisma) fica em `./csv-import.server`, carregada via
// import dinâmico dentro dos handlers (removidos do bundle do client).
//
// A importação é feita EM LOTES: o client envia ~100 linhas por chamada e
// atualiza a barra de progresso entre as chamadas.
// ==========================================================================

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CsvDiscoInfo, CsvLoteResult } from "./csv";

const csvLeadRowSchema = z.object({
	linha: z.number().int().positive(),
	razao_social: z.string(),
	nome_titular: z.string(),
	email: z.string(),
	telefone: z.string(),
});

const loteInputSchema = z.object({
	linhas: z.array(csvLeadRowSchema).min(1).max(500),
});

const discoLoteInputSchema = z.object({
	offset: z.number().int().nonnegative(),
	limit: z.number().int().positive().max(500),
});

/**
 * Importa um lote de linhas de CSV já parseadas pelo client.
 * Dedup por telefone normalizado → e-mail: existente atualiza, novo cria.
 */
export const importarLeadsLoteServerFn = createServerFn({ method: "POST" })
	.validator(loteInputSchema)
	.handler(async ({ data }): Promise<CsvLoteResult> => {
		const { processarLinhasCsv } = await import("./csv-import.server");
		return processarLinhasCsv(data.linhas);
	});

/**
 * Info do CSV no caminho fixo do disco (preview antes de importar).
 */
export const infoCsvDiscoServerFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<CsvDiscoInfo> => {
		const { lerInfoCsvDisco } = await import("./csv-import.server");
		return lerInfoCsvDisco();
	},
);

/**
 * Importa um lote [offset, offset+limit) do CSV em disco.
 * O client chama em loop para ter barra de progresso real.
 */
export const importarLoteDiscoServerFn = createServerFn({ method: "POST" })
	.validator(discoLoteInputSchema)
	.handler(async ({ data }): Promise<CsvLoteResult> => {
		const { importarLoteCsvDisco } = await import("./csv-import.server");
		return importarLoteCsvDisco(data.offset, data.limit);
	});
