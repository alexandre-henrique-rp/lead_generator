// ==========================================================================
// lead_generator — funil.ts (funil de vendas: proposta + contrato)
// Fluxo: Orçamento → Proposta → (aceite do cliente) → Contrato →
//        (assinatura do cliente) → libera execução (Kanban no projeto).
// Assinatura simples: nome + CPF/CNPJ + data + hash sha256.
// Padrão .server: só `createServerFn` + types exportados.
// ==========================================================================

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { createHash, randomBytes } from "node:crypto";

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

function novoToken(): string {
	return randomBytes(24).toString("hex");
}

function assinaturaHash(parts: Array<string | number>): string {
	return createHash("sha256").update(parts.join("|")).digest("hex");
}

// ──────────────────────────────────────────────────────────────────────
// Tipos expostos ao frontend
// ──────────────────────────────────────────────────────────────────────

export interface PropostaDTO {
	uuid: string;
	token: string;
	status: string;
	resumo: string;
	tempoTotalHoras: number;
	precoFinalCentavos: number;
	aceiteNome: string | null;
	aceiteDoc: string | null;
	aceiteEm: string | null;
	enviadaEm: string | null;
	slideUrl: string | null;
	slideNome: string | null;
	createdAt: string;
}

export interface ContratoDTO {
	uuid: string;
	token: string;
	status: string;
	projetoNome: string;
	resumo: string;
	precoFinalCentavos: number;
	assinaturaNome: string | null;
	assinaturaDoc: string | null;
	assinaturaEm: string | null;
	enviadoEm: string | null;
	createdAt: string;
}

export interface FunilProjetoDTO {
	uuid: string;
	nome: string;
	descricao: string | null;
	estado: string;
	valorTotalCentavos: number;
	temOrcamento: boolean;
	orcamentoResumo: string | null;
	orcamentoHoras: number;
	orcamentoPrecoFinalCentavos: number;
	proposta: PropostaDTO | null;
	contrato: ContratoDTO | null;
	contratoAssinado: boolean;
}

function propostaToDTO(p: any): PropostaDTO {
	// Último arquivo de slide (categoria SLIDE_PROPOSTA).
	const slide =
		(p.arquivos ?? [])
			.filter((a: any) => a.categoria === "SLIDE_PROPOSTA")
			.sort(
				(a: any, b: any) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			)[0] ?? null;
	return {
		uuid: p.uuid,
		token: p.token,
		status: p.status,
		resumo: p.resumo,
		tempoTotalHoras: p.tempoTotalHoras,
		precoFinalCentavos: p.precoFinalCentavos,
		aceiteNome: p.aceiteNome ?? null,
		aceiteDoc: p.aceiteDoc ?? null,
		aceiteEm: p.aceiteEm ? p.aceiteEm.toISOString() : null,
		enviadaEm: p.enviadaEm ? p.enviadaEm.toISOString() : null,
		slideUrl: slide?.url ?? null,
		slideNome: slide?.originalName ?? null,
		createdAt: p.createdAt.toISOString(),
	};
}

function contratoToDTO(c: any): ContratoDTO {
	return {
		uuid: c.uuid,
		token: c.token,
		status: c.status,
		projetoNome: c.projetoNome,
		resumo: c.resumo,
		precoFinalCentavos: c.precoFinalCentavos,
		assinaturaNome: c.assinaturaNome ?? null,
		assinaturaDoc: c.assinaturaDoc ?? null,
		assinaturaEm: c.assinaturaEm ? c.assinaturaEm.toISOString() : null,
		enviadoEm: c.enviadoEm ? c.enviadoEm.toISOString() : null,
		createdAt: c.createdAt.toISOString(),
	};
}

// ──────────────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────────────

const leadUuidSchema = z.object({ leadUuid: z.string().min(1) });
const projetoUuidSchema = z.object({ projetoUuid: z.string().min(1) });
const propostaUuidSchema = z.object({ propostaUuid: z.string().min(1) });
const tokenSchema = z.object({ token: z.string().min(1) });
const assinaturaSchema = z.object({
	token: z.string().min(1),
	nome: z.string().trim().min(3, "Informe o nome completo").max(160),
	doc: z
		.string()
		.trim()
		.transform((s) => s.replace(/\D/g, ""))
		.refine((s) => s.length === 11 || s.length === 14, "CPF ou CNPJ inválido"),
});

// ──────────────────────────────────────────────────────────────────────
// Leitura — projetos do lead com estado do funil
// ──────────────────────────────────────────────────────────────────────

export const listFunilDoLeadServerFn = createServerFn({ method: "GET" })
	.validator(leadUuidSchema)
	.handler(
		async ({ data: { leadUuid } }): Promise<{ projetos: FunilProjetoDTO[] }> => {
			await requireAuth();
			const { prisma } = await import("#/db");

			const lead = await prisma.lead.findUnique({
				where: { uuid: leadUuid },
				select: { id: true },
			});
			if (!lead) return { projetos: [] };

			const projetos = await prisma.projeto.findMany({
				where: { leadId: lead.id, isActive: true },
				orderBy: { createdAt: "desc" },
				include: {
					orcamento: true,
					propostas: {
						orderBy: { createdAt: "desc" },
						take: 1,
						include: { arquivos: true },
					},
					contratos: { orderBy: { createdAt: "desc" }, take: 1 },
				},
			});

			return {
				projetos: projetos.map((p) => {
					const proposta = p.propostas[0] ?? null;
					const contrato = p.contratos[0] ?? null;
					return {
						uuid: p.uuid,
						nome: p.nome,
						descricao: p.descricao,
						estado: p.estado,
						valorTotalCentavos: p.valorTotalCentavos,
						temOrcamento: !!p.orcamento,
						orcamentoResumo: p.orcamento?.resumo ?? null,
						orcamentoHoras: p.orcamento?.tempoTotalHoras ?? 0,
						orcamentoPrecoFinalCentavos: p.orcamento?.precoFinalCentavos ?? 0,
						proposta: proposta ? propostaToDTO(proposta) : null,
						contrato: contrato ? contratoToDTO(contrato) : null,
						contratoAssinado: contrato?.status === "ASSINADO",
					};
				}),
			};
		},
	);

// ──────────────────────────────────────────────────────────────────────
// Proposta
// ──────────────────────────────────────────────────────────────────────

export const gerarPropostaServerFn = createServerFn({ method: "POST" })
	.validator(projetoUuidSchema)
	.handler(async ({ data: { projetoUuid } }): Promise<{ proposta: PropostaDTO }> => {
		await requireAuth();
		const { prisma } = await import("#/db");

		const projeto = await prisma.projeto.findUnique({
			where: { uuid: projetoUuid },
			include: { orcamento: true },
		});
		if (!projeto) throw new Error("Projeto não encontrado");
		if (!projeto.orcamento) {
			throw new Error(
				"Gere o orçamento antes de criar a proposta (resumo + valor).",
			);
		}

		const proposta = await prisma.proposta.create({
			data: {
				projetoId: projeto.id,
				token: novoToken(),
				status: "RASCUNHO",
				resumo: projeto.orcamento.resumo,
				tempoTotalHoras: projeto.orcamento.tempoTotalHoras,
				precoFinalCentavos: projeto.orcamento.precoFinalCentavos,
			},
			include: { arquivos: true },
		});
		return { proposta: propostaToDTO(proposta) };
	});

// Upload do slide (PDF) da proposta — operador autenticado.
const uploadSlideSchema = z.object({
	propostaUuid: z.string().min(1),
	fileName: z.string().min(1).max(260),
	mimeType: z.string().min(1).max(160),
	base64: z.string().min(1),
});

export const uploadSlidePropostaServerFn = createServerFn({ method: "POST" })
	.validator(uploadSlideSchema)
	.handler(async ({ data }): Promise<{ proposta: PropostaDTO }> => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const proposta = await prisma.proposta.findUnique({
			where: { uuid: data.propostaUuid },
			include: { projeto: { select: { id: true, uuid: true } } },
		});
		if (!proposta) throw new Error("Proposta não encontrada");
		if (proposta.status === "ACEITA") {
			throw new Error("Proposta já aceita — não é possível alterar o slide.");
		}
		if (!/pdf/i.test(data.mimeType) && !/\.pdf$/i.test(data.fileName)) {
			throw new Error("Envie um arquivo PDF.");
		}

		const buffer = Buffer.from(data.base64, "base64");
		if (buffer.length === 0) throw new Error("Arquivo vazio.");
		if (buffer.length > 25 * 1024 * 1024) {
			throw new Error("PDF acima de 25MB.");
		}

		const { uploadArquivo } = await import("#/lib/storage.server");
		const stored = await uploadArquivo({
			buffer,
			originalName: data.fileName,
			mimeType: "application/pdf",
			projetoUuid: proposta.projeto.uuid,
			pasta: "propostas",
		});

		// Remove slides anteriores desta proposta (mantém só o atual).
		await prisma.arquivo.deleteMany({
			where: { propostaId: proposta.id, categoria: "SLIDE_PROPOSTA" },
		});
		await prisma.arquivo.create({
			data: {
				originalName: data.fileName,
				storageKey: stored.storageKey,
				bucket: stored.bucket,
				url: stored.url,
				mimeType: "application/pdf",
				ext: stored.ext,
				size: stored.size,
				hash: stored.hash,
				tipo: "DOCUMENTO",
				categoria: "SLIDE_PROPOSTA",
				storageTipo: stored.storageTipo,
				projetoId: proposta.projeto.id,
				propostaId: proposta.id,
			},
		});

		const atualizada = await prisma.proposta.findUnique({
			where: { id: proposta.id },
			include: { arquivos: true },
		});
		return { proposta: propostaToDTO(atualizada) };
	});

const propostaUuidOnly = z.object({ propostaUuid: z.string().min(1) });

/** Publica o link da proposta (RASCUNHO → ENVIADA). */
export const publicarPropostaServerFn = createServerFn({ method: "POST" })
	.validator(propostaUuidOnly)
	.handler(async ({ data }): Promise<{ proposta: PropostaDTO }> => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const p = await prisma.proposta.findUnique({
			where: { uuid: data.propostaUuid },
		});
		if (!p) throw new Error("Proposta não encontrada");
		if (p.status === "ACEITA") {
			throw new Error("Proposta já aceita.");
		}
		const atualizada = await prisma.proposta.update({
			where: { id: p.id },
			data: { status: "ENVIADA", enviadaEm: new Date(), revogadoEm: null },
			include: { arquivos: true },
		});
		return { proposta: propostaToDTO(atualizada) };
	});

/** Regenera o link: invalida o token antigo e cria um novo (volta a ENVIADA). */
export const regenerarLinkPropostaServerFn = createServerFn({ method: "POST" })
	.validator(propostaUuidOnly)
	.handler(async ({ data }): Promise<{ proposta: PropostaDTO }> => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const p = await prisma.proposta.findUnique({
			where: { uuid: data.propostaUuid },
		});
		if (!p) throw new Error("Proposta não encontrada");
		if (p.status === "ACEITA") {
			throw new Error("Proposta já aceita — não é possível regenerar o link.");
		}
		const atualizada = await prisma.proposta.update({
			where: { id: p.id },
			data: {
				token: novoToken(),
				status: "ENVIADA",
				enviadaEm: new Date(),
				revogadoEm: null,
			},
			include: { arquivos: true },
		});
		return { proposta: propostaToDTO(atualizada) };
	});

export interface SocioPublicoDTO {
	uuid: string;
	nomeSocio: string;
	cnpjCpfDoSocio: string | null;
	qualificacaoSocio: string | null;
	faixaEtaria: string | null;
	percentualCapital: number | null;
}

export interface EmpresaPropostaDTO {
	nome: string;
	razaoSocial: string | null;
	cnpj: string | null;
	cidade: string | null;
	uf: string | null;
	endereco: string | null;
	capitalSocialCentavos: number | null;
	socios: SocioPublicoDTO[];
}

// Pública — buscar proposta por token (sem auth)
export const getPropostaPublicaServerFn = createServerFn({ method: "GET" })
	.validator(tokenSchema)
	.handler(
		async ({
			data: { token },
		}): Promise<{
			proposta: PropostaDTO | null;
			projetoNome: string | null;
			empresa: EmpresaPropostaDTO | null;
			motivo: "OK" | "NAO_ENCONTRADA" | "RASCUNHO" | "REVOGADA";
		}> => {
			const { prisma } = await import("#/db");
			const p = await prisma.proposta.findUnique({
				where: { token },
				include: {
					projeto: {
						select: {
							nome: true,
							lead: {
								include: {
									socios: {
										orderBy: { ordem: "asc" },
									},
								},
							},
						},
					},
					arquivos: true,
				},
			});
			if (!p) return { proposta: null, projetoNome: null, empresa: null, motivo: "NAO_ENCONTRADA" };
			// RASCUNHO ainda não foi publicada → link não vale.
			if (p.status === "RASCUNHO") {
				return { proposta: null, projetoNome: null, empresa: null, motivo: "RASCUNHO" };
			}

			const lead = p.projeto?.lead;
			const empresa: EmpresaPropostaDTO | null = lead
				? {
						nome: lead.nome,
						razaoSocial: lead.razaoSocial,
						cnpj: lead.cnpj,
						cidade: lead.cidade,
						uf: lead.uf,
						endereco: lead.endereco,
						capitalSocialCentavos: lead.capitalSocialCentavos,
						socios: (lead.socios ?? []).map((s) => ({
							uuid: s.uuid,
							nomeSocio: s.nomeSocio,
							cnpjCpfDoSocio: s.cnpjCpfDoSocio,
							qualificacaoSocio: s.qualificacaoSocio,
							faixaEtaria: s.faixaEtaria,
							percentualCapital: s.percentualCapital,
						})),
					}
				: null;

			return {
				proposta: propostaToDTO(p),
				projetoNome: p.projeto.nome,
				empresa,
				motivo: "OK",
			};
		},
	);

// Pública — aceite do cliente
export const aceitarPropostaServerFn = createServerFn({ method: "POST" })
	.validator(assinaturaSchema)
	.handler(async ({ data }): Promise<{ proposta: PropostaDTO }> => {
		const { prisma } = await import("#/db");
		const p = await prisma.proposta.findUnique({ where: { token: data.token } });
		if (!p) throw new Error("Proposta não encontrada");
		if (p.status === "ACEITA") {
			return { proposta: propostaToDTO(p) };
		}
		if (p.status === "RECUSADA") {
			throw new Error("Esta proposta foi recusada.");
		}

		const agora = new Date();
		const hash = assinaturaHash([
			"proposta",
			p.uuid,
			p.precoFinalCentavos,
			data.nome,
			data.doc,
			agora.toISOString(),
		]);
		const atualizada = await prisma.proposta.update({
			where: { id: p.id },
			data: {
				status: "ACEITA",
				aceiteNome: data.nome,
				aceiteDoc: data.doc,
				aceiteEm: agora,
				aceiteHash: hash,
			},
		});
		return { proposta: propostaToDTO(atualizada) };
	});

// ──────────────────────────────────────────────────────────────────────
// Contrato
// ──────────────────────────────────────────────────────────────────────

export const gerarContratoServerFn = createServerFn({ method: "POST" })
	.validator(propostaUuidSchema)
	.handler(async ({ data: { propostaUuid } }): Promise<{ contrato: ContratoDTO }> => {
		await requireAuth();
		const { prisma } = await import("#/db");

		const proposta = await prisma.proposta.findUnique({
			where: { uuid: propostaUuid },
			include: { projeto: { select: { id: true, nome: true } } },
		});
		if (!proposta) throw new Error("Proposta não encontrada");
		if (proposta.status !== "ACEITA") {
			throw new Error("O cliente precisa aceitar a proposta antes do contrato.");
		}

		const contrato = await prisma.contrato.create({
			data: {
				projetoId: proposta.projeto.id,
				propostaId: proposta.id,
				token: novoToken(),
				status: "ENVIADO",
				projetoNome: proposta.projeto.nome,
				resumo: proposta.resumo,
				precoFinalCentavos: proposta.precoFinalCentavos,
				enviadoEm: new Date(),
			},
		});
		return { contrato: contratoToDTO(contrato) };
	});

// Pública — buscar contrato por token
export const getContratoPublicoServerFn = createServerFn({ method: "GET" })
	.validator(tokenSchema)
	.handler(
		async ({ data: { token } }): Promise<{ contrato: ContratoDTO | null }> => {
			const { prisma } = await import("#/db");
			const c = await prisma.contrato.findUnique({ where: { token } });
			if (!c) return { contrato: null };
			return { contrato: contratoToDTO(c) };
		},
	);

// Pública — assinatura do cliente (libera execução do projeto)
export const assinarContratoServerFn = createServerFn({ method: "POST" })
	.validator(assinaturaSchema)
	.handler(async ({ data }): Promise<{ contrato: ContratoDTO }> => {
		const { prisma } = await import("#/db");
		const c = await prisma.contrato.findUnique({ where: { token: data.token } });
		if (!c) throw new Error("Contrato não encontrado");
		if (c.status === "ASSINADO") {
			return { contrato: contratoToDTO(c) };
		}

		const agora = new Date();
		const hash = assinaturaHash([
			"contrato",
			c.uuid,
			c.precoFinalCentavos,
			data.nome,
			data.doc,
			agora.toISOString(),
		]);

		const [atualizado] = await prisma.$transaction([
			prisma.contrato.update({
				where: { id: c.id },
				data: {
					status: "ASSINADO",
					assinaturaNome: data.nome,
					assinaturaDoc: data.doc,
					assinaturaEm: agora,
					assinaturaHash: hash,
				},
			}),
			// Libera o projeto para execução.
			prisma.projeto.update({
				where: { id: c.projetoId },
				data: { estado: "EM_DESENVOLVIMENTO" },
			}),
		]);
		return { contrato: contratoToDTO(atualizado) };
	});
