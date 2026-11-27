// ==========================================================================
// King Ops — api/interacoes.ts
// --------------------------------------------------------------------------
// Server functions para listar e criar anotações / registros de contato
// do operador no lead (model InteracaoLead).
//
// Padrão: createServerFn + dynamic import do prisma dentro do handler.
// ==========================================================================

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const TIPOS_INTERACAO = [
	"WHATSAPP",
	"LIGACAO",
	"REUNIAO",
	"PESQUISA_IA",
	"BRASILAPI",
	"NOTA",
] as const;

export type TipoInteracao = (typeof TIPOS_INTERACAO)[number];

export type InteracaoLeadDto = {
	uuid: string;
	tipo: TipoInteracao;
	resumo: string;
	createdAt: string;
};

const leadUuidSchema = z.object({ leadUuid: z.string().min(1) });

const criarInteracaoSchema = leadUuidSchema.extend({
	tipo: z.enum(TIPOS_INTERACAO),
	resumo: z.string().trim().min(1).max(2000),
});

export const listarInteracoesServerFn = createServerFn({
	method: "GET",
})
	.validator(leadUuidSchema)
	.handler(async ({ data }): Promise<InteracaoLeadDto[]> => {
		const { prisma } = await import("#/db");

		const lead = await prisma.lead.findUnique({
			where: { uuid: data.leadUuid },
			select: { id: true },
		});
		if (!lead) return [];

		const interacoes = await prisma.interacaoLead.findMany({
			where: { leadId: lead.id },
			orderBy: { createdAt: "desc" },
			select: {
				uuid: true,
				tipo: true,
				resumo: true,
				createdAt: true,
			},
		});

		return interacoes.map((i) => ({
			uuid: i.uuid,
			tipo: i.tipo as TipoInteracao,
			resumo: i.resumo,
			createdAt: i.createdAt.toISOString(),
		}));
	});

export const criarInteracaoServerFn = createServerFn({
	method: "POST",
})
	.validator(criarInteracaoSchema)
	.handler(async ({ data }): Promise<InteracaoLeadDto> => {
		const { prisma } = await import("#/db");

		const lead = await prisma.lead.findUnique({
			where: { uuid: data.leadUuid },
			select: { id: true },
		});
		if (!lead) throw new Error("Lead não encontrado.");

		const interacao = await prisma.interacaoLead.create({
			data: {
				leadId: lead.id,
				tipo: data.tipo,
				resumo: data.resumo,
			},
			select: {
				uuid: true,
				tipo: true,
				resumo: true,
				createdAt: true,
			},
		});

		return {
			uuid: interacao.uuid,
			tipo: interacao.tipo as TipoInteracao,
			resumo: interacao.resumo,
			createdAt: interacao.createdAt.toISOString(),
		};
	});
