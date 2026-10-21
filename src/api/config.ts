// ==========================================================================
// King Ops — config.ts (singletons: PriceConfig + ConfiguracaoEmpresa)
// Padrão .server.ts: só `createServerFn` + types exportados.
// ==========================================================================

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";

const SESSION_COOKIE_NAME = "lead_generator_session";

const updatePriceConfigSchema = z.object({
	custoHoraCentavos: z.number().int().min(0).max(100000).optional(),
	precoHoraTabelaCentavos: z.number().int().min(0).max(1000000).optional(),
	margemMinima: z.number().min(1).max(10).optional(),
	regime: z
		.enum([
			"SIMPLES_NACIONAL_ANEXO_I",
			"SIMPLES_NACIONAL_ANEXO_III",
			"SIMPLES_NACIONAL_ANEXO_V",
			"LUCRO_PRESUMIDO",
			"MEI",
		])
		.optional(),
	aliquotaImpostos: z.number().min(0).max(1).optional(),
	prolaboreCentavos: z.number().int().min(0).optional(),
	inssAliquota: z.number().min(0).max(1).optional(),
	reservaMesesVazios: z.number().min(0).max(1).optional(),
	custoFixoMensalCentavos: z.number().int().min(0).optional(),
});

const updateConfiguracaoEmpresaSchema = z.object({
	razaoSocial: z.string().min(2).max(160).optional(),
	cnpj: z.string().min(11).max(18).optional(),
	endereco: z.string().min(2).max(500).optional(),
});

export type PriceConfig = {
	custoHoraCentavos: number;
	precoHoraTabelaCentavos: number;
	margemMinima: number;
	regime: string;
	aliquotaImpostos: number;
	prolaboreCentavos: number;
	inssAliquota: number;
	reservaMesesVazios: number;
	custoFixoMensalCentavos: number;
	bloqueioPiso: boolean;
};

export type ConfiguracaoEmpresa = {
	razaoSocial: string;
	cnpj: string;
	endereco: string;
};

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

export const getPriceConfigServerFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<{ config: PriceConfig }> => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const row = await prisma.priceConfig.findUnique({ where: { id: 1 } });
		if (!row) {
			// Cria com defaults se não existir
			const created = await prisma.priceConfig.create({ data: { id: 1 } });
			return { config: rowToPriceConfig(created) };
		}
		return { config: rowToPriceConfig(row) };
	},
);

function rowToPriceConfig(row: any): PriceConfig {
	return {
		custoHoraCentavos: row.custoHoraCentavos,
		precoHoraTabelaCentavos: row.precoHoraTabelaCentavos,
		margemMinima: row.margemMinima,
		regime: row.regime,
		aliquotaImpostos: row.aliquotaImpostos,
		prolaboreCentavos: row.prolaboreCentavos,
		inssAliquota: row.inssAliquota,
		reservaMesesVazios: row.reservaMesesVazios,
		custoFixoMensalCentavos: row.custoFixoMensalCentavos,
		bloqueioPiso: row.bloqueioPiso,
	};
}

export const updatePriceConfigServerFn = createServerFn({ method: "POST" })
	.validator(updatePriceConfigSchema)
	.handler(async ({ data }): Promise<{ config: PriceConfig }> => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const row = await prisma.priceConfig.update({
			where: { id: 1 },
			data,
		});
		return { config: rowToPriceConfig(row) };
	});

/**
 * Restaura os defaults do PriceConfig. O bloqueioPiso (G-03) NUNCA é desligado.
 */
export const restorePriceConfigDefaultsServerFn = createServerFn({
	method: "POST",
}).handler(async (): Promise<{ config: PriceConfig }> => {
	await requireAuth();
	const { prisma } = await import("#/db");
	const row = await prisma.priceConfig.update({
		where: { id: 1 },
		data: {
			custoHoraCentavos: 6059,
			precoHoraTabelaCentavos: 9500,
			margemMinima: 1.5,
			regime: "SIMPLES_NACIONAL_ANEXO_III",
			aliquotaImpostos: 0.06,
			prolaboreCentavos: 224000,
			inssAliquota: 0.11,
			reservaMesesVazios: 0.1,
			custoFixoMensalCentavos: 350000,
			bloqueioPiso: true,
		},
	});
	return { config: rowToPriceConfig(row) };
});

export const getConfiguracaoEmpresaServerFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<{ config: ConfiguracaoEmpresa }> => {
	await requireAuth();
	const { prisma } = await import("#/db");
	let row = await prisma.configuracaoEmpresa.findUnique({ where: { id: 1 } });
	if (!row) {
		row = await prisma.configuracaoEmpresa.create({
			data: {
				id: 1,
				razaoSocial: "KING DEV · TEC LTDA",
				cnpj: "30.367.375/0001-55",
				endereco: "Ribeirão Preto/SP",
			},
		});
	}
	return {
		config: {
			razaoSocial: row.razaoSocial,
			cnpj: row.cnpj,
			endereco: row.endereco,
		},
	};
});

export const updateConfiguracaoEmpresaServerFn = createServerFn({
	method: "POST",
})
	.validator(updateConfiguracaoEmpresaSchema)
	.handler(async ({ data }): Promise<{ config: ConfiguracaoEmpresa }> => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const row = await prisma.configuracaoEmpresa.update({
			where: { id: 1 },
			data,
		});
		return {
			config: {
				razaoSocial: row.razaoSocial,
				cnpj: row.cnpj,
				endereco: row.endereco,
			},
		};
	});
