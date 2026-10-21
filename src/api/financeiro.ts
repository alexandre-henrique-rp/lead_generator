// ==========================================================================
// King Ops — financeiro.ts (parcelas + pagamentos)
// Padrão .server.ts: só `createServerFn` + types exportados.
// ==========================================================================

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";

const SESSION_COOKIE_NAME = "lead_generator_session";

const listFiltrosSchema = z.object({
	status: z.enum(["PENDENTE", "PAGA", "ATRASADA", "CANCELADA"]).optional(),
	projetoUuid: z.string().optional(),
});

const uuidParamSchema = z.object({ uuid: z.string().min(1) });

const marcarPagaSchema = z.object({
	parcelaUuid: z.string().min(1),
	valorCentavos: z.number().int().positive().optional(),
	observacoes: z.string().max(500).optional(),
});

export type ListFiltros = z.infer<typeof listFiltrosSchema>;
export type MarcarPagaInput = z.infer<typeof marcarPagaSchema>;

export interface ParcelaItem {
	id: string;
	uuid: string;
	projetoUuid: string;
	projetoNome: string;
	clienteNome: string | null;
	numero: number;
	valorCentavos: number;
	dataVencimento: string;
	dataPagamento: string | null;
	status: "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA";
	pagaComAtraso: boolean;
	observacoes: string | null;
	createdAt: string;
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

/**
 * Calcula status em runtime: ATRASADA se vencimento < hoje e != PAGA/CANCELADA.
 * (Espelha a regra do schema do king_ops.)
 */
function calcularStatusReal(
	statusBanco: string,
	dataVencimento: Date,
	dataPagamento: Date | null,
): "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA" {
	if (statusBanco === "PAGA" && dataPagamento) return "PAGA";
	if (statusBanco === "CANCELADA") return "CANCELADA";
	if (dataVencimento < new Date()) return "ATRASADA";
	return "PENDENTE";
}

function parcelaParaItem(p: any): ParcelaItem {
	const dataVenc = new Date(p.dataVencimento);
	const dataPag = p.dataPagamento ? new Date(p.dataPagamento) : null;
	return {
		id: String(p.id),
		uuid: p.uuid,
		projetoUuid: p.projeto?.uuid ?? "",
		projetoNome: p.projeto?.nome ?? "",
		clienteNome: p.projeto?.lead?.nome ?? null,
		numero: p.numero,
		valorCentavos: p.valorCentavos,
		dataVencimento: dataVenc.toISOString(),
		dataPagamento: dataPag?.toISOString() ?? null,
		status: calcularStatusReal(p.status, dataVenc, dataPag),
		pagaComAtraso: p.pagaComAtraso,
		observacoes: p.observacoes,
		createdAt: p.createdAt.toISOString(),
	};
}

export const listParcelasServerFn = createServerFn({ method: "GET" })
	.validator(listFiltrosSchema.optional())
	.handler(async ({ data }): Promise<{ parcelas: ParcelaItem[] }> => {
		await requireAuth();
		const { prisma } = await import("#/db");

		const where: Record<string, unknown> = {};
		if (data?.status) where.status = data.status;
		if (data?.projetoUuid) {
			const projeto = await prisma.projeto.findUnique({
				where: { uuid: data.projetoUuid },
				select: { id: true },
			});
			if (projeto) where.projetoId = projeto.id;
			else where.projetoId = -1;
		}

		const rows = await prisma.parcela.findMany({
			where,
			orderBy: { dataVencimento: "asc" },
			include: {
				projeto: {
					include: { lead: { select: { nome: true } } },
				},
			},
		});

		return { parcelas: rows.map(parcelaParaItem) };
	});

export const marcarParcelaPagaServerFn = createServerFn({ method: "POST" })
	.validator(marcarPagaSchema)
	.handler(async ({ data }) => {
		await requireAuth();
		const { prisma } = await import("#/db");

		const parcela = await prisma.parcela.findUnique({
			where: { uuid: data.parcelaUuid },
		});
		if (!parcela) throw new Error("Parcela não encontrada");

		const pagaComAtraso = new Date() > new Date(parcela.dataVencimento);
		const valor = data.valorCentavos ?? parcela.valorCentavos;

		const [, pagamento] = await prisma.$transaction([
			prisma.parcela.update({
				where: { uuid: data.parcelaUuid },
				data: {
					status: "PAGA",
					dataPagamento: new Date(),
					pagaComAtraso,
					observacoes: data.observacoes ?? parcela.observacoes,
				},
			}),
			prisma.pagamento.create({
				data: {
					projetoId: parcela.projetoId,
					parcelaId: parcela.id,
					valorCentavos: valor,
					data: new Date(),
					observacoes: data.observacoes,
				},
			}),
		]);

		return { ok: true as const, pagamentoUuid: pagamento.uuid };
	});
