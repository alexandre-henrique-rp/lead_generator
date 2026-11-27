/**
 * Geração de 1ª mensagem WhatsApp para um lead.
 *
 * Server function chamável pelo client (RPC). O handler é removido do
 * bundle do client; a lógica real (chamada Gemini) fica em
 * `./ai-message.server` (import dinâmico, só resolve no servidor).
 *
 * Se o Gemini falhar (chave inválida, modelo indisponível, sem rede), a
 * função THROW — a UI captura e mostra erro. SEM fallback de texto
 * fabricado. Se você vê texto na tela, é 100% do Gemini.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CanalMensagem } from "./prompts/cold-outreach";

export type { CanalMensagem };

export const CANAIS_MENSAGEM = ["WHATSAPP", "EMAIL"] as const;

export const gerarMensagemInputSchema = z.object({
	leadUuid: z.string().min(1),
	/** Mensagem atual na tela — quando presente, o Gemini ITERA em cima
	 * dela (modo melhoria) em vez de gerar do zero. */
	mensagemAtual: z.string().max(4000).optional(),
	/** Canal de destino (padrão WHATSAPP). EMAIL gera assunto + corpo
	 * em parágrafos pro template HTML da King Dev. */
	canal: z.enum(CANAIS_MENSAGEM).optional(),
});

export type GerarMensagemInput = z.infer<typeof gerarMensagemInputSchema>;

export const PRIORIDADE_OPORTUNIDADE = {
	ENTRADA: "ENTRADA",
	PRINCIPAL: "PRINCIPAL",
	EXPANSAO: "EXPANSAO",
} as const;

export type PrioridadeOportunidade =
	(typeof PRIORIDADE_OPORTUNIDADE)[keyof typeof PRIORIDADE_OPORTUNIDADE];

export interface OportunidadeTi {
	titulo: string;
	dor: string;
	servico: string;
	ganho: string;
	prioridade: PrioridadeOportunidade;
}

export interface MensagemGerada {
	analise: string;
	mensagem: string;
	/** Só existe no canal EMAIL — assunto ≤60 chars com curiosidade. */
	assunto?: string;
	oportunidades: OportunidadeTi[];
	modelo: string;
	/** Canal que foi usado pra gerar (ecoa o input, default WHATSAPP). */
	canal: CanalMensagem;
}

export const gerarMensagemServerFn = createServerFn({ method: "POST" })
	.validator(gerarMensagemInputSchema)
	.handler(async ({ data }): Promise<MensagemGerada> => {
		const { gerarMensagemParaLead } = await import("./ai-message.server");
		return gerarMensagemParaLead(data.leadUuid, {
			mensagemAtual: data.mensagemAtual,
			canal: data.canal ?? "WHATSAPP",
		});
	});

export const salvarMensagemLeadInputSchema = z.object({
	leadUuid: z.string().min(1),
	canal: z.enum(CANAIS_MENSAGEM),
	mensagem: z.string().min(1, "A mensagem não pode ficar vazia."),
	assunto: z.string().optional(),
	templateHtml: z.string().optional(),
	oportunidades: z.array(z.any()).optional(),
	registrarHistorico: z.boolean().optional(),
});

export type SalvarMensagemLeadInput = z.infer<
	typeof salvarMensagemLeadInputSchema
>;

export const salvarMensagemLeadServerFn = createServerFn({ method: "POST" })
	.validator(salvarMensagemLeadInputSchema)
	.handler(async ({ data }) => {
		const { prisma } = await import("#/db");

		const lead = await prisma.lead.findUnique({
			where: { uuid: data.leadUuid },
			select: { id: true, uuid: true, nome: true },
		});
		if (!lead) throw new Error("Lead não encontrado.");

		await prisma.lead.update({
			where: { id: lead.id },
			data: {
				mensagemIa: data.mensagem,
				assuntoEmailIa: data.assunto || null,
				canalMensagemIa: data.canal,
				templateHtmlIa: data.templateHtml || null,
				oportunidadesIa: data.oportunidades
					? JSON.stringify(data.oportunidades)
					: null,
			},
		});

		if (data.registrarHistorico) {
			const resumoNota =
				data.canal === "EMAIL"
					? `Template de E-mail comercial e mensagem salvos (Assunto: ${data.assunto ?? "Sem assunto"}).`
					: `Mensagem de WhatsApp e oportunidades de TI salvas.`;

			await prisma.interacaoLead.create({
				data: {
					leadId: lead.id,
					tipo: data.canal === "EMAIL" ? "NOTA" : "WHATSAPP",
					resumo: resumoNota,
				},
			});
		}

		return {
			ok: true,
			leadUuid: lead.uuid,
			mensagem: "Mensagem e template salvos no banco com sucesso!",
		};
	});
