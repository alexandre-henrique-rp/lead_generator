/**
 * Pesquisa na web sobre uma empresa.
 *
 * Server function chamável pelo client (RPC). O handler é removido do
 * bundle do client; a lógica real (chamada Gemini com Google Search
 * Grounding) fica em `./research.server` (import dinâmico).
 *
 * Retorna um resumo + contato (site, emails, telefones, WhatsApp,
 * decisores) + URLs das fontes consultadas. A UI mostra preview e o
 * Operador decide o que aplicar nas Observações/campos do lead.
 *
 * A fronteira é validada com zod (regra do AGENTS.md): a resposta do
 * server fn passa por `empresaPesquisadaSchema.parse` antes de chegar
 * ao client.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const pesquisarEmpresaInputSchema = z.object({
	leadUuid: z.string().min(1),
});

export type PesquisarEmpresaInput = z.infer<typeof pesquisarEmpresaInputSchema>;

export const empresaPesquisadaSchema = z.object({
	resumo: z.string(),
	fontes: z.array(z.object({ uri: z.string(), titulo: z.string() })),
	queriesUsadas: z.array(z.string()),
	modelo: z.string(),
	fonte: z.enum(["gemini-grounded", "places", "lead-data"]),
	site: z.string().nullable(),
	emails: z.array(z.string()),
	telefones: z.array(z.string()),
	whatsapp: z.string().nullable(),
	decisores: z.array(
		z.object({ nome: z.string(), cargo: z.string().nullable() }),
	),
	tentativas: z.array(
		z.object({
			tier: z.enum(["gemini-grounded", "places", "lead-data"]),
			ok: z.boolean(),
			motivo: z.string().optional(),
		}),
	),
});

export type EmpresaPesquisada = z.infer<typeof empresaPesquisadaSchema>;

export const pesquisarEmpresaServerFn = createServerFn({ method: "POST" })
	.validator(pesquisarEmpresaInputSchema)
	.handler(async ({ data }): Promise<EmpresaPesquisada> => {
		const { pesquisarEmpresa } = await import("./research.server");
		const { prisma } = await import("#/db");

		const lead = await prisma.lead.findUnique({
			where: { uuid: data.leadUuid },
			select: {
				id: true,
				nome: true,
				razaoSocial: true,
				cnpj: true,
				website: true,
				cidade: true,
				uf: true,
				cnaeFiscalDescricao: true,
			},
		});

		if (!lead) {
			throw new Error(`Lead ${data.leadUuid} não encontrado.`);
		}

		const resultado = await pesquisarEmpresa({
			...lead,
			etapaFunil: "",
			observacoes: null,
			porte: null,
			dataInicioAtividade: null,
			capitalSocialCentavos: null,
			descricaoSituacaoCadastral: null,
		});

		// Persiste a pesquisa (1:1 com o lead, upsert da ÚLTIMA execução).
		// O gerador de 1ª mensagem lê esse registro pra enriquecer o prompt.
		// Falha de persistência NÃO derruba a pesquisa já pronta — só loga.
		try {
			const linhas = {
				resumo: resultado.resumo,
				fonte: resultado.fonte,
				modelo: resultado.modelo,
				site: resultado.site,
				emails: JSON.stringify(resultado.emails),
				telefones: JSON.stringify(resultado.telefones),
				whatsapp: resultado.whatsapp,
				decisores: JSON.stringify(resultado.decisores),
				fontes: JSON.stringify(resultado.fontes),
				queriesUsadas: JSON.stringify(resultado.queriesUsadas),
				tentativas: JSON.stringify(resultado.tentativas),
			};
			await prisma.pesquisaLead.upsert({
				where: { leadId: lead.id },
				create: { leadId: lead.id, ...linhas },
				update: linhas,
			});
			await prisma.interacaoLead.create({
				data: {
					leadId: lead.id,
					tipo: "PESQUISA_IA",
					resumo: `Pesquisa Grounded concluída: ${resultado.resumo.slice(0, 180)}... por ${resultado.modelo}`,
				},
			});
		} catch (err) {
			console.error(
				`[research] ❌ falha ao persistir PesquisaLead do lead ${lead.id}:`,
				err instanceof Error ? err.message : err,
			);
		}

		return empresaPesquisadaSchema.parse(resultado);
	});
