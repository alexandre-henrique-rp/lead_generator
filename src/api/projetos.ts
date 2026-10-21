// ==========================================================================
// King Ops — projetos.ts (server functions CRUD de projetos + kanban)
// Padrão .server.ts: só `createServerFn` + types exportados.
// ==========================================================================

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { calcularOrcamento } from "#/lib/orcamento-calc";

const SESSION_COOKIE_NAME = "lead_generator_session";

const listFiltrosSchema = z.object({
	estado: z
		.enum([
			"LEVANTAMENTO",
			"DOCUMENTACAO",
			"ORCAMENTO",
			"CONTRATO",
			"EM_DESENVOLVIMENTO",
			"ENTREGUE",
			"FINALIZADO",
			"CANCELADO",
		])
		.optional(),
	busca: z.string().trim().max(120).optional(),
});

const uuidParamSchema = z.object({ uuid: z.string().min(1) });

export const createProjetoSchema = z.object({
	leadUuid: z.string().min(1).optional(),
	nome: z.string().trim().min(1, "Informe o nome do projeto").max(160),
	descricao: z.string().trim().max(2000).optional(),
});

export const updateProjetoSchema = z.object({
	uuid: z.string().min(1),
	nome: z.string().optional(),
	descricao: z.string().nullable().optional(),
	estado: z.string().optional(),
	progresso: z.number().int().min(0).max(100).optional(),
	pausado: z.boolean().optional(),
	valorTotalCentavos: z.number().int().min(0).optional(),
});

const createSprintSchema = z.object({
	projetoUuid: z.string().min(1),
	nome: z.string().min(1).max(120),
});

const updateSprintStatusSchema = z.object({
	sprintUuid: z.string().min(1),
	status: z.enum(["PLANEJAMENTO", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"]),
});

const updateTaskStatusSchema = z.object({
	taskUuid: z.string().min(1),
	status: z.enum(["A_FAZER", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"]),
});

const updateSprintSchema = z.object({
	sprintUuid: z.string().min(1),
	nome: z.string().trim().min(1).max(120).optional(),
	tempoGastoHoras: z.number().min(0).max(100000).optional(),
});

const createTaskSchema = z.object({
	sprintUuid: z.string().min(1),
	nome: z.string().trim().min(1).max(120),
	descricao: z.string().trim().max(500).optional(),
	horasEstimadas: z.number().min(0).max(100000).optional(),
	subtasks: z.array(z.string().trim().min(1).max(200)).optional(),
});

const updateTaskSchema = z.object({
	taskUuid: z.string().min(1),
	nome: z.string().trim().min(1).max(120).optional(),
	descricao: z.string().trim().max(500).nullable().optional(),
	horasEstimadas: z.number().min(0).max(100000).optional(),
	tempoGastoHoras: z.number().min(0).max(100000).optional(),
});

const uuidOnlySchema = z.object({ uuid: z.string().min(1) });

const addSubtaskSchema = z.object({
	taskUuid: z.string().min(1),
	nome: z.string().trim().min(1).max(200),
});

const subtaskIdSchema = z.object({ subtaskId: z.number().int().positive() });

const importKanbanTaskSchema = z.object({
	nome: z.string().trim().min(1).max(120),
	descricao: z.string().trim().max(500).optional(),
	horasEstimadas: z.coerce.number().min(0).max(100000).optional(),
	subtasks: z.array(z.string().trim().min(1).max(200)).optional(),
});

const importKanbanSprintSchema = z.object({
	nome: z.string().trim().min(1).max(120),
	tasks: z.array(importKanbanTaskSchema).optional(),
});

const importKanbanSchema = z.object({
	projetoUuid: z.string().min(1),
	substituir: z.boolean().optional(),
	kanban: z.object({
		sprints: z
			.array(importKanbanSprintSchema)
			.min(1, "Informe ao menos 1 sprint"),
	}),
});

const saveOrcamentoSchema = z.object({
	projetoUuid: z.string().min(1),
	resumo: z.string().trim().min(1, "Informe o resumo").max(2000),
	tempoTotalHoras: z.number().min(0).max(100000),
	descontoTipo: z.enum(["PERCENTUAL", "VALOR"]).optional(),
	descontoValor: z.number().min(0).optional(),
	precoHoraCentavos: z.number().int().min(0).max(1000000).optional(),
	observacoes: z.string().trim().max(2000).optional(),
});

export type ListFiltros = z.infer<typeof listFiltrosSchema>;
export type UpdateProjetoInput = z.infer<typeof updateProjetoSchema>;
export type CreateProjetoInput = z.infer<typeof createProjetoSchema>;

export interface OrcamentoData {
	uuid: string;
	resumo: string;
	tempoTotalHoras: number;
	custoProjetoCentavos: number;
	pisoCentavos: number;
	precoBrutoCentavos: number;
	descontoTipo: "PERCENTUAL" | "VALOR" | null;
	descontoValor: number;
	descontoAplicadoCentavos: number;
	precoFinalCentavos: number;
	impostoEstimadoCentavos: number;
	lucroEstimadoCentavos: number;
	abaixoDoPiso: boolean;
	precoHoraCentavos: number;
	precoHoraPadraoCentavos: number;
	observacoes: string | null;
	updatedAt: string;
}

export interface ProjetoListItem {
	id: string;
	uuid: string;
	nome: string;
	descricao: string | null;
	leadNome: string | null;
	leadUuid: string | null;
	estado: string;
	progresso: number;
	pausado: boolean;
	interrompidoPorFaltaDePagamento: boolean;
	statusPagamento: string;
	dataInicio: string | null;
	dataEntregaPrevista: string | null;
	valorTotalCentavos: number;
	createdAt: string;
}

export interface ProjetoDetalhe {
	id: string;
	uuid: string;
	nome: string;
	descricao: string | null;
	leadNome: string | null;
	leadUuid: string | null;
	estado: string;
	progresso: number;
	pausado: boolean;
	interrompidoPorFaltaDePagamento: boolean;
	statusPagamento: string;
	dataInicio: string | null;
	dataEntregaPrevista: string | null;
	valorTotalCentavos: number;
	createdAt: string;
	updatedAt: string;
	contratoAssinado: boolean;
}

export interface KanbanData {
	totalHorasEstimadas: number;
	sprints: Array<{
		uuid: string;
		nome: string;
		status: string;
		ordem: number;
		tempoGastoHoras: number;
		horasEstimadas: number;
		tasks: Array<{
			uuid: string;
			nome: string;
			descricao: string | null;
			status: string;
			ordem: number;
			horasEstimadas: number;
			tempoGastoHoras: number;
			subtasksCount: number;
			subtasksConcluidas: number;
			subtasks: Array<{
				id: number;
				nome: string;
				concluida: boolean;
				ordem: number;
			}>;
		}>;
	}>;
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

function projetoParaListItem(p: any): ProjetoListItem {
	return {
		id: String(p.id),
		uuid: p.uuid,
		nome: p.nome,
		descricao: p.descricao,
		leadNome: p.lead?.nome ?? null,
		leadUuid: p.lead?.uuid ?? null,
		estado: p.estado,
		progresso: p.progresso,
		pausado: p.pausado,
		interrompidoPorFaltaDePagamento: p.interrompidoPorFaltaDePagamento,
		statusPagamento: p.statusPagamento,
		dataInicio: p.dataInicio?.toISOString() ?? null,
		dataEntregaPrevista: p.dataEntregaPrevista?.toISOString() ?? null,
		valorTotalCentavos: p.valorTotalCentavos,
		createdAt: p.createdAt.toISOString(),
	};
}

export const listProjetosServerFn = createServerFn({ method: "GET" })
	.validator(listFiltrosSchema.optional())
	.handler(async ({ data }): Promise<{ projetos: ProjetoListItem[] }> => {
		await requireAuth();
		const { prisma } = await import("#/db");

		const where: Record<string, unknown> = { isActive: true };
		if (data?.estado) where.estado = data.estado;
		if (data?.busca) {
			where.OR = [
				{ nome: { contains: data.busca } },
				{ lead: { nome: { contains: data.busca } } },
			];
		}

		const rows = await prisma.projeto.findMany({
			where,
			orderBy: { createdAt: "desc" },
			include: { lead: { select: { uuid: true, nome: true } } },
		});

		return { projetos: rows.map(projetoParaListItem) };
	});

export const createProjetoServerFn = createServerFn({ method: "POST" })
	.validator(createProjetoSchema)
	.handler(async ({ data }): Promise<{ projeto: ProjetoListItem }> => {
		await requireAuth();
		const { prisma } = await import("#/db");

		let leadId: number | null = null;
		if (data.leadUuid) {
			const lead = await prisma.lead.findUnique({
				where: { uuid: data.leadUuid },
				select: { id: true },
			});
			if (!lead) throw new Error("Lead não encontrado");
			leadId = lead.id;
		}

		const row = await prisma.projeto.create({
			data: {
				leadId,
				nome: data.nome,
				descricao: data.descricao ?? null,
			},
			include: { lead: { select: { uuid: true, nome: true } } },
		});

		return { projeto: projetoParaListItem(row) };
	});

export const getProjetoServerFn = createServerFn({ method: "GET" })
	.validator(uuidParamSchema)
	.handler(async ({ data: { uuid } }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const row = await prisma.projeto.findUnique({
			where: { uuid },
			include: { lead: { select: { uuid: true, nome: true } } },
		});
		if (!row || !row.isActive) return { projeto: null };

		const contratoAssinado = await prisma.contrato.count({
			where: { projetoId: row.id, status: "ASSINADO" },
		});

		return {
			projeto: {
				...projetoParaListItem(row),
				updatedAt: row.updatedAt.toISOString(),
				contratoAssinado: contratoAssinado > 0,
			} as ProjetoDetalhe,
		};
	});

export const getKanbanServerFn = createServerFn({ method: "GET" })
	.validator(uuidParamSchema)
	.handler(async ({ data: { uuid } }): Promise<{ kanban: KanbanData | null }> => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const projeto = await prisma.projeto.findUnique({ where: { uuid } });
		if (!projeto || !projeto.isActive) return { kanban: null };

		const sprints = await prisma.sprint.findMany({
			where: { projetoId: projeto.id },
			orderBy: { ordem: "asc" },
			include: {
				tarefas: {
					orderBy: { ordem: "asc" },
					include: { subtasks: true },
				},
			},
		});

		return {
			kanban: {
				totalHorasEstimadas: sprints.reduce(
					(accS, s) =>
						accS + s.tarefas.reduce((accT, t) => accT + t.horasEstimadas, 0),
					0,
				),
				sprints: sprints.map((s) => ({
					uuid: s.uuid,
					nome: s.nome,
					status: s.status,
					ordem: s.ordem,
					tempoGastoHoras: s.tarefas.reduce(
						(acc, t) => acc + t.tempoGastoHoras,
						0,
					),
					horasEstimadas: s.tarefas.reduce(
						(acc, t) => acc + t.horasEstimadas,
						0,
					),
					tasks: s.tarefas.map((t) => ({
						uuid: t.uuid,
						nome: t.nome,
						descricao: t.descricao,
						status: t.status,
						ordem: t.ordem,
						horasEstimadas: t.horasEstimadas,
						tempoGastoHoras: t.tempoGastoHoras,
						subtasksCount: t.subtasks.length,
						subtasksConcluidas: t.subtasks.filter((st) => st.concluida).length,
						subtasks: [...t.subtasks]
							.sort((a, b) => a.ordem - b.ordem)
							.map((st) => ({
								id: st.id,
								nome: st.nome,
								concluida: st.concluida,
								ordem: st.ordem,
							})),
					})),
				})),
			},
		};
	});

export const updateProjetoServerFn = createServerFn({ method: "POST" })
	.validator(updateProjetoSchema)
	.handler(async ({ data }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const { uuid, ...patch } = data;

		const row = await prisma.projeto.update({
			where: { uuid },
			data: {
				...(patch.nome !== undefined && { nome: patch.nome }),
				...(patch.descricao !== undefined && {
					descricao: patch.descricao,
				}),
				...(patch.estado !== undefined && { estado: patch.estado }),
				...(patch.progresso !== undefined && { progresso: patch.progresso }),
				...(patch.pausado !== undefined && { pausado: patch.pausado }),
				...(patch.valorTotalCentavos !== undefined && {
					valorTotalCentavos: patch.valorTotalCentavos,
				}),
			},
			include: { lead: { select: { uuid: true, nome: true } } },
		});
		return { projeto: projetoParaListItem(row) };
	});

export const createSprintServerFn = createServerFn({ method: "POST" })
	.validator(createSprintSchema)
	.handler(async ({ data }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const projeto = await prisma.projeto.findUnique({
			where: { uuid: data.projetoUuid },
			select: { id: true },
		});
		if (!projeto) throw new Error("Projeto não encontrado");

		const ultima = await prisma.sprint.findFirst({
			where: { projetoId: projeto.id },
			orderBy: { ordem: "desc" },
		});

		const sprint = await prisma.sprint.create({
			data: {
				projetoId: projeto.id,
				nome: data.nome,
				ordem: (ultima?.ordem ?? -1) + 1,
			},
		});
		return { sprint };
	});

export const updateSprintStatusServerFn = createServerFn({ method: "POST" })
	.validator(updateSprintStatusSchema)
	.handler(async ({ data }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		await prisma.sprint.update({
			where: { uuid: data.sprintUuid },
			data: { status: data.status },
		});
		return { ok: true as const };
	});

export const updateTaskStatusServerFn = createServerFn({ method: "POST" })
	.validator(updateTaskStatusSchema)
	.handler(async ({ data }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		await prisma.task.update({
			where: { uuid: data.taskUuid },
			data: { status: data.status },
		});
		return { ok: true as const };
	});

// ──────────────────────────────────────────────────────────────────────
// Kanban — edição de Sprint / Task / Subtask
// ──────────────────────────────────────────────────────────────────────

export const updateSprintServerFn = createServerFn({ method: "POST" })
	.validator(updateSprintSchema)
	.handler(async ({ data }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		await prisma.sprint.update({
			where: { uuid: data.sprintUuid },
			data: {
				...(data.nome !== undefined && { nome: data.nome }),
				...(data.tempoGastoHoras !== undefined && {
					tempoGastoHoras: data.tempoGastoHoras,
				}),
			},
		});
		return { ok: true as const };
	});

export const deleteSprintServerFn = createServerFn({ method: "POST" })
	.validator(uuidOnlySchema)
	.handler(async ({ data: { uuid } }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		// onDelete: Cascade remove as tarefas e subtasks vinculadas.
		await prisma.sprint.delete({ where: { uuid } });
		return { ok: true as const };
	});

export const createTaskServerFn = createServerFn({ method: "POST" })
	.validator(createTaskSchema)
	.handler(async ({ data }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const sprint = await prisma.sprint.findUnique({
			where: { uuid: data.sprintUuid },
			select: { id: true, projetoId: true },
		});
		if (!sprint) throw new Error("Sprint não encontrada");

		const ultima = await prisma.task.findFirst({
			where: { sprintId: sprint.id },
			orderBy: { ordem: "desc" },
		});

		const task = await prisma.task.create({
			data: {
				projetoId: sprint.projetoId,
				sprintId: sprint.id,
				nome: data.nome,
				descricao: data.descricao ?? null,
				horasEstimadas: data.horasEstimadas ?? 0,
				ordem: (ultima?.ordem ?? -1) + 1,
				...(data.subtasks && data.subtasks.length > 0
					? {
							subtasks: {
								create: data.subtasks.map((nome, i) => ({
									nome,
									ordem: i,
								})),
							},
						}
					: {}),
			},
		});
		return { task };
	});

export const updateTaskServerFn = createServerFn({ method: "POST" })
	.validator(updateTaskSchema)
	.handler(async ({ data }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		await prisma.task.update({
			where: { uuid: data.taskUuid },
			data: {
				...(data.nome !== undefined && { nome: data.nome }),
				...(data.descricao !== undefined && { descricao: data.descricao }),
				...(data.horasEstimadas !== undefined && {
					horasEstimadas: data.horasEstimadas,
				}),
				...(data.tempoGastoHoras !== undefined && {
					tempoGastoHoras: data.tempoGastoHoras,
				}),
			},
		});
		return { ok: true as const };
	});

export const deleteTaskServerFn = createServerFn({ method: "POST" })
	.validator(uuidOnlySchema)
	.handler(async ({ data: { uuid } }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		await prisma.task.delete({ where: { uuid } });
		return { ok: true as const };
	});

export const addSubtaskServerFn = createServerFn({ method: "POST" })
	.validator(addSubtaskSchema)
	.handler(async ({ data }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const task = await prisma.task.findUnique({
			where: { uuid: data.taskUuid },
			select: { id: true },
		});
		if (!task) throw new Error("Task não encontrada");

		const ultima = await prisma.subtask.findFirst({
			where: { taskId: task.id },
			orderBy: { ordem: "desc" },
		});

		const subtask = await prisma.subtask.create({
			data: {
				taskId: task.id,
				nome: data.nome,
				ordem: (ultima?.ordem ?? -1) + 1,
			},
		});
		return { subtask };
	});

export const toggleSubtaskServerFn = createServerFn({ method: "POST" })
	.validator(subtaskIdSchema)
	.handler(async ({ data: { subtaskId } }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		const atual = await prisma.subtask.findUnique({
			where: { id: subtaskId },
			select: { concluida: true },
		});
		if (!atual) throw new Error("Subtask não encontrada");
		await prisma.subtask.update({
			where: { id: subtaskId },
			data: { concluida: !atual.concluida },
		});
		return { ok: true as const };
	});

export const removeSubtaskServerFn = createServerFn({ method: "POST" })
	.validator(subtaskIdSchema)
	.handler(async ({ data: { subtaskId } }) => {
		await requireAuth();
		const { prisma } = await import("#/db");
		await prisma.subtask.delete({ where: { id: subtaskId } });
		return { ok: true as const };
	});

// ──────────────────────────────────────────────────────────────────────
// Orçamento (P2.3) — cálculo G-02 (piso) + G-03 (bloqueio)
// ──────────────────────────────────────────────────────────────────────

async function carregarPriceConfig() {
	const { prisma } = await import("#/db");
	const row =
		(await prisma.priceConfig.findUnique({ where: { id: 1 } })) ??
		(await prisma.priceConfig.create({ data: { id: 1 } }));
	return row;
}

export const getOrcamentoServerFn = createServerFn({ method: "GET" })
	.validator(uuidParamSchema)
	.handler(
		async ({
			data: { uuid },
		}): Promise<{ orcamento: OrcamentoData | null }> => {
			await requireAuth();
			const { prisma } = await import("#/db");
			const projeto = await prisma.projeto.findUnique({
				where: { uuid },
				select: { id: true },
			});
			if (!projeto) return { orcamento: null };

			const row = await prisma.orcamento.findUnique({
				where: { projetoId: projeto.id },
			});
			if (!row) return { orcamento: null };

			const cfg = await carregarPriceConfig();
			const precoHora = row.precoHoraCentavos ?? cfg.precoHoraTabelaCentavos;
			const calc = calcularOrcamento({
				tempoTotalHoras: row.tempoTotalHoras,
				custoHoraCentavos: cfg.custoHoraCentavos,
				precoHoraTabelaCentavos: precoHora,
				margemMinima: cfg.margemMinima,
				aliquotaImpostos: cfg.aliquotaImpostos,
				bloqueioPiso: cfg.bloqueioPiso,
				descontoTipo: (row.descontoTipo ?? undefined) as
					| "PERCENTUAL"
					| "VALOR"
					| undefined,
				descontoValor: row.descontoValor,
			});

			return {
				orcamento: {
					uuid: row.uuid,
					resumo: row.resumo,
					tempoTotalHoras: row.tempoTotalHoras,
					custoProjetoCentavos: calc.custoProjetoCentavos,
					pisoCentavos: calc.pisoCentavos,
					precoBrutoCentavos: calc.precoBrutoCentavos,
					descontoTipo: (row.descontoTipo ?? null) as
						| "PERCENTUAL"
						| "VALOR"
						| null,
					descontoValor: row.descontoValor,
					descontoAplicadoCentavos: calc.descontoAplicadoCentavos,
					precoFinalCentavos: calc.precoFinalCentavos,
					impostoEstimadoCentavos: calc.impostoEstimadoCentavos,
					lucroEstimadoCentavos: calc.lucroEstimadoCentavos,
					abaixoDoPiso: calc.abaixoDoPiso,
					precoHoraCentavos: precoHora,
					precoHoraPadraoCentavos: cfg.precoHoraTabelaCentavos,
					observacoes: row.observacoes ?? null,
					updatedAt: row.updatedAt.toISOString(),
				},
			};
		},
	);

export const saveOrcamentoServerFn = createServerFn({ method: "POST" })
	.validator(saveOrcamentoSchema)
	.handler(async ({ data }): Promise<{ orcamento: OrcamentoData }> => {
		await requireAuth();
		const { prisma } = await import("#/db");

		const projeto = await prisma.projeto.findUnique({
			where: { uuid: data.projetoUuid },
			select: { id: true },
		});
		if (!projeto) throw new Error("Projeto não encontrado");

		const cfg = await carregarPriceConfig();
		const precoHora = data.precoHoraCentavos ?? cfg.precoHoraTabelaCentavos;
		const calc = calcularOrcamento({
			tempoTotalHoras: data.tempoTotalHoras,
			custoHoraCentavos: cfg.custoHoraCentavos,
			precoHoraTabelaCentavos: precoHora,
			margemMinima: cfg.margemMinima,
			aliquotaImpostos: cfg.aliquotaImpostos,
			bloqueioPiso: cfg.bloqueioPiso,
			descontoTipo: data.descontoTipo,
			descontoValor: data.descontoValor,
		});

		// G-03: bloqueio de margem no servidor.
		if (calc.bloqueado) {
			throw new Error(
				`PISO_DE_MARGEM: preço final (R$ ${(calc.precoFinalCentavos / 100).toFixed(2)}) está abaixo do piso de margem (R$ ${(calc.pisoCentavos / 100).toFixed(2)}).`,
			);
		}

		const persisted = {
			resumo: data.resumo,
			tempoTotalHoras: calc.tempoTotalHoras,
			valorTotalCentavos: calc.precoBrutoCentavos,
			pisoCentavos: calc.pisoCentavos,
			precoFinalCentavos: calc.precoFinalCentavos,
			descontoTipo: data.descontoTipo ?? null,
			descontoValor: data.descontoValor ?? 0,
			precoHoraCentavos: data.precoHoraCentavos ?? null,
			observacoes: data.observacoes ?? null,
		};

		const row = await prisma.orcamento.upsert({
			where: { projetoId: projeto.id },
			create: { projetoId: projeto.id, ...persisted },
			update: persisted,
		});

		// Reflete o preço final no projeto (valor contratado estimado).
		await prisma.projeto.update({
			where: { id: projeto.id },
			data: { valorTotalCentavos: calc.precoFinalCentavos },
		});

		return {
			orcamento: {
				uuid: row.uuid,
				resumo: row.resumo,
				tempoTotalHoras: row.tempoTotalHoras,
				custoProjetoCentavos: calc.custoProjetoCentavos,
				pisoCentavos: calc.pisoCentavos,
				precoBrutoCentavos: calc.precoBrutoCentavos,
				descontoTipo: data.descontoTipo ?? null,
				descontoValor: data.descontoValor ?? 0,
				descontoAplicadoCentavos: calc.descontoAplicadoCentavos,
				precoFinalCentavos: calc.precoFinalCentavos,
				impostoEstimadoCentavos: calc.impostoEstimadoCentavos,
				lucroEstimadoCentavos: calc.lucroEstimadoCentavos,
				abaixoDoPiso: calc.abaixoDoPiso,
				precoHoraCentavos: precoHora,
				precoHoraPadraoCentavos: cfg.precoHoraTabelaCentavos,
				observacoes: row.observacoes ?? null,
				updatedAt: row.updatedAt.toISOString(),
			},
		};
	});

// ──────────────────────────────────────────────────────────────────────
// Importação de Kanban via JSON (sprints/tasks com horas estimadas)
// ──────────────────────────────────────────────────────────────────────

export const importarKanbanServerFn = createServerFn({ method: "POST" })
	.validator(importKanbanSchema)
	.handler(
		async ({
			data,
		}): Promise<{
			sprintsCriadas: number;
			tasksCriadas: number;
			totalHorasEstimadas: number;
		}> => {
			await requireAuth();
			const { prisma } = await import("#/db");

			const projeto = await prisma.projeto.findUnique({
				where: { uuid: data.projetoUuid },
				select: { id: true },
			});
			if (!projeto) throw new Error("Projeto não encontrado");

			let sprintsCriadas = 0;
			let tasksCriadas = 0;
			let totalHorasEstimadas = 0;

			await prisma.$transaction(async (tx) => {
				// Opção de substituir: remove sprints existentes do projeto.
				if (data.substituir) {
					await tx.sprint.deleteMany({ where: { projetoId: projeto.id } });
				}

				const ultimaSprint = await tx.sprint.findFirst({
					where: { projetoId: projeto.id },
					orderBy: { ordem: "desc" },
				});
				let ordemSprint = (ultimaSprint?.ordem ?? -1) + 1;

				for (const sprintIn of data.kanban.sprints) {
					const sprint = await tx.sprint.create({
						data: {
							projetoId: projeto.id,
							nome: sprintIn.nome,
							ordem: ordemSprint++,
						},
					});
					sprintsCriadas++;

					let ordemTask = 0;
					for (const taskIn of sprintIn.tasks ?? []) {
						const horas = taskIn.horasEstimadas ?? 0;
						totalHorasEstimadas += horas;
						await tx.task.create({
							data: {
								projetoId: projeto.id,
								sprintId: sprint.id,
								nome: taskIn.nome,
								descricao: taskIn.descricao ?? null,
								horasEstimadas: horas,
								ordem: ordemTask++,
								...(taskIn.subtasks && taskIn.subtasks.length > 0
									? {
											subtasks: {
												create: taskIn.subtasks.map((nome, i) => ({
													nome,
													ordem: i,
												})),
											},
										}
									: {}),
							},
						});
						tasksCriadas++;
					}
				}
			});

			return { sprintsCriadas, tasksCriadas, totalHorasEstimadas };
		},
	);
