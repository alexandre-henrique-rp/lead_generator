import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import { formatCurrencyBRL, formatDateBR } from "#/lib/format";
import {
	addSubtaskServerFn,
	createSprintServerFn,
	createTaskServerFn,
	deleteSprintServerFn,
	deleteTaskServerFn,
	getKanbanServerFn,
	getProjetoServerFn,
	importarKanbanServerFn,
	removeSubtaskServerFn,
	toggleSubtaskServerFn,
	updateSprintStatusServerFn,
	updateTaskServerFn,
	updateTaskStatusServerFn,
	type KanbanData,
	type ProjetoDetalhe,
} from "#/api/projetos";
import { requireUserOrRedirect } from "#/lib/auth-helper";
import { projetoKeys } from "#/lib/query-keys";
import { gerarPromptKanban } from "#/lib/kanban-prompt";
import LevantamentoSection from "#/componentes/orquestracao/levantamento-section";

export const Route = createFileRoute("/projetos/$id")({
	beforeLoad: ({ location }) =>
		requireUserOrRedirect("/login", location.pathname),
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData({
				queryKey: projetoKeys.detail(params.id),
				queryFn: () => getProjetoServerFn({ data: { uuid: params.id } }),
			}),
			context.queryClient.ensureQueryData({
				queryKey: projetoKeys.kanban(params.id),
				queryFn: () => getKanbanServerFn({ data: { uuid: params.id } }),
			}),
		]);
		return null;
	},
	component: ProjetoDetailPage,
});

type TaskStatus = "A_FAZER" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
type SprintStatus = "PLANEJAMENTO" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";

type KanbanSprint = KanbanData["sprints"][number];
type KanbanTask = KanbanSprint["tasks"][number];

const COLUNAS: {
	status: TaskStatus;
	titulo: string;
	barColor: string;
	textColor: string;
}[] = [
	{ status: "A_FAZER", titulo: "A FAZER", barColor: "bg-sky-500", textColor: "text-sky-400" },
	{ status: "EM_ANDAMENTO", titulo: "EM ANDAMENTO", barColor: "bg-indigo-500", textColor: "text-indigo-400" },
	{ status: "CONCLUIDA", titulo: "CONCLUÍDA", barColor: "bg-emerald-500", textColor: "text-emerald-400" },
	{ status: "CANCELADA", titulo: "CANCELADA", barColor: "bg-rose-500", textColor: "text-rose-400" },
];

function ProjetoDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();

	const projetoQuery = useQuery({
		queryKey: projetoKeys.detail(id),
		queryFn: () => getProjetoServerFn({ data: { uuid: id } }),
	});
	const kanbanQuery = useQuery({
		queryKey: projetoKeys.kanban(id),
		queryFn: () => getKanbanServerFn({ data: { uuid: id } }),
	});

	const invalidateKanban = () =>
		queryClient.invalidateQueries({ queryKey: projetoKeys.kanban(id) });

	const [sprintSelecionada, setSprintSelecionada] = useState<string | null>(
		null,
	);
	const [dragTaskUuid, setDragTaskUuid] = useState<string | null>(null);
	const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
	const [taskDetalheUuid, setTaskDetalheUuid] = useState<string | null>(null);

	// Modais
	const [importOpen, setImportOpen] = useState(false);
	const [importText, setImportText] = useState("");
	const [importSubstituir, setImportSubstituir] = useState(false);
	const [importErro, setImportErro] = useState("");
	const [importOk, setImportOk] = useState("");
	const [promptOpen, setPromptOpen] = useState(false);
	const [promptContexto, setPromptContexto] = useState("");
	const [promptLocal, setPromptLocal] = useState("");
	const [promptCopiado, setPromptCopiado] = useState(false);

	// Mutations
	const taskStatusMutation = useMutation({
		mutationFn: (vars: { taskUuid: string; status: TaskStatus }) =>
			updateTaskStatusServerFn({ data: vars }),
		onSuccess: invalidateKanban,
	});
	const taskHorasMutation = useMutation({
		mutationFn: (vars: {
			taskUuid: string;
			horasEstimadas?: number;
			tempoGastoHoras?: number;
		}) => updateTaskServerFn({ data: vars }),
		onSuccess: invalidateKanban,
	});
	const sprintStatusMutation = useMutation({
		mutationFn: (vars: { sprintUuid: string; status: SprintStatus }) =>
			updateSprintStatusServerFn({ data: vars }),
		onSuccess: invalidateKanban,
	});
	const createSprintMutation = useMutation({
		mutationFn: (nome: string) =>
			createSprintServerFn({ data: { projetoUuid: id, nome } }),
		onSuccess: invalidateKanban,
	});
	const deleteSprintMutation = useMutation({
		mutationFn: (uuid: string) => deleteSprintServerFn({ data: { uuid } }),
		onSuccess: invalidateKanban,
	});
	const createTaskMutation = useMutation({
		mutationFn: (vars: { sprintUuid: string; nome: string }) =>
			createTaskServerFn({ data: vars }),
		onSuccess: invalidateKanban,
	});
	const deleteTaskMutation = useMutation({
		mutationFn: (uuid: string) => deleteTaskServerFn({ data: { uuid } }),
		onSuccess: invalidateKanban,
	});
	const addSubtaskMutation = useMutation({
		mutationFn: (vars: { taskUuid: string; nome: string }) =>
			addSubtaskServerFn({ data: vars }),
		onSuccess: invalidateKanban,
	});
	const toggleSubtaskMutation = useMutation({
		mutationFn: (subtaskId: number) =>
			toggleSubtaskServerFn({ data: { subtaskId } }),
		onSuccess: invalidateKanban,
	});
	const removeSubtaskMutation = useMutation({
		mutationFn: (subtaskId: number) =>
			removeSubtaskServerFn({ data: { subtaskId } }),
		onSuccess: invalidateKanban,
	});
	const importMutation = useMutation({
		mutationFn: (payload: { kanban: unknown; substituir: boolean }) =>
			importarKanbanServerFn({
				data: {
					projetoUuid: id,
					substituir: payload.substituir,
					kanban: payload.kanban as { sprints: [] },
				},
			}),
		onSuccess: async (res) => {
			setImportErro("");
			setImportOk(
				`Importado: ${res.sprintsCriadas} sprint(s), ${res.tasksCriadas} tarefa(s), ${res.totalHorasEstimadas}h.`,
			);
			setImportText("");
			await invalidateKanban();
			setTimeout(() => {
				setImportOpen(false);
				setImportOk("");
			}, 1500);
		},
		onError: (e: unknown) =>
			setImportErro(e instanceof Error ? e.message : "Erro ao importar."),
	});

	if (projetoQuery.isPending) {
		return (
			<AppShell title="Carregando projeto…">
				<div className="text-slate-400 text-sm">Carregando…</div>
			</AppShell>
		);
	}
	if (projetoQuery.isError || !projetoQuery.data?.projeto) {
		return (
			<AppShell title="Projeto não encontrado">
				<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
					<p className="text-red-300 mb-4">Projeto não encontrado.</p>
					<Link to="/projetos">
						<Button variant="primary" size="sm">
							← Voltar para Projetos
						</Button>
					</Link>
				</div>
			</AppShell>
		);
	}

	const projeto: ProjetoDetalhe = projetoQuery.data.projeto;
	const kanban: KanbanData | null = kanbanQuery.data?.kanban ?? null;
	const sprints = kanban?.sprints ?? [];

	// Resolve a sprint ativa.
	const sprintAtiva: KanbanSprint | null =
		sprints.find((s) => s.uuid === sprintSelecionada) ?? sprints[0] ?? null;

	function handleNovaSprint() {
		const nome = window.prompt("Nome da nova sprint:");
		if (!nome || !nome.trim()) return;
		createSprintMutation.mutate(nome.trim(), {
			onSuccess: () => {},
		});
	}
	function handleNovaTask(sprintUuid: string) {
		const nome = window.prompt("Nome da nova tarefa:");
		if (!nome || !nome.trim()) return;
		createTaskMutation.mutate({ sprintUuid, nome: nome.trim() });
	}
	function handleNovoItem(taskUuid: string) {
		const nome = window.prompt("Nome do item (subtask):");
		if (!nome || !nome.trim()) return;
		addSubtaskMutation.mutate({ taskUuid, nome: nome.trim() });
	}
	function handleExcluirSprint(uuid: string, nome: string) {
		if (
			window.confirm(
				`Excluir a sprint "${nome}" e todas as suas tarefas? Não pode ser desfeito.`,
			)
		) {
			if (sprintSelecionada === uuid) setSprintSelecionada(null);
			deleteSprintMutation.mutate(uuid);
		}
	}
	function handleExcluirTask(uuid: string, nome: string) {
		if (window.confirm(`Excluir a tarefa "${nome}"?`)) {
			deleteTaskMutation.mutate(uuid);
		}
	}

	function handleDrop(status: TaskStatus) {
		setDragOverStatus(null);
		if (!dragTaskUuid || !sprintAtiva) return;
		const task = sprintAtiva.tasks.find((t) => t.uuid === dragTaskUuid);
		setDragTaskUuid(null);
		if (!task || task.status === status) return;
		taskStatusMutation.mutate({ taskUuid: task.uuid, status });
	}

	const promptGerado = () =>
		gerarPromptKanban({
			projetoNome: projeto.nome,
			contexto: promptContexto,
			localizacaoArquivos: promptLocal,
		});

	return (
		<AppShell
			title={projeto.nome}
			description={`Cliente: ${projeto.leadNome || "Cliente"} · Valor: ${formatCurrencyBRL(projeto.valorTotalCentavos)}`}
			breadcrumb="4. Execução & Entrega / Workspace do Projeto (/projetos/$id)"
			badge={
				projeto.contratoAssinado
					? "✓ CONTRATO ASSINADO (PKI) · EXECUÇÃO LIBERADA"
					: "⏳ AGUARDANDO ASSINATURA DIGITAL DO CONTRATO (PKI)"
			}
			badgeColor={projeto.contratoAssinado ? "emerald" : "amber"}
			actions={
				<div className="flex items-center gap-2">
					<Link to="/projetos">
						<Button variant="outline" size="sm">
							← Projetos
						</Button>
					</Link>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setPromptCopiado(false);
							setPromptOpen(true);
						}}
					>
						✨ Gerar Prompt p/ IA
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setImportErro("");
							setImportOk("");
							setImportOpen(true);
						}}
					>
						{ } Importar JSON
					</Button>
					<Button
						variant="primary"
						size="sm"
						onClick={handleNovaSprint}
						isLoading={createSprintMutation.isPending}
					>
						+ Nova sprint
					</Button>
				</div>
			}
		>
			<div className="space-y-6">
				{/* Strip de Metadados e Gate Contratual (Penpot Board 02) */}
				<div
					className={`rounded-xl border p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm ${
						projeto.contratoAssinado
							? "bg-[#111625] border-[#0d6e4b]"
							: "bg-[#111625] border-amber-800/80"
					}`}
				>
					<div className="flex flex-wrap items-center gap-3">
						<span
							className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
								projeto.contratoAssinado
									? "bg-[#062e21] border-[#0d6e4b] text-[#34d399]"
									: "bg-amber-950/80 border-amber-700/80 text-amber-300"
							}`}
						>
							<span
								className={`w-1.5 h-1.5 rounded-full ${
									projeto.contratoAssinado ? "bg-[#10b981]" : "bg-amber-400"
								}`}
							/>
							{projeto.contratoAssinado
								? `✓ Gate Contratual: Assinado em ${formatDateBR(projeto.contratoAssinadoEm || projeto.updatedAt)}`
								: "⏳ Gate Contratual: Pendente de assinatura"}
						</span>

						<span className="text-xs font-mono text-slate-300">
							Início: {formatDateBR(projeto.dataInicio) || "26/10/2026"} · Entrega Prevista:{" "}
							{formatDateBR(projeto.dataEntregaPrevista) || "15/12/2026"} · Progresso:{" "}
							<strong className="text-white">{projeto.progresso}%</strong>
						</span>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{projeto.leadUuid && (
							<Link to={`/leads/${projeto.leadUuid}`}>
								<Button variant="outline" size="sm" className="text-xs">
									← Abrir Ficha do Lead
								</Button>
							</Link>
						)}
						<Link to={`/p/relatorio/${projeto.uuid}`} target="_blank">
							<Button variant="primary" size="sm" className="text-xs flex items-center gap-1">
								<span>📊</span>
								<span>Relatório Público (/p/relatorio) ↗</span>
							</Button>
						</Link>
					</div>
				</div>

				{/* 1 · Levantamento de Requisitos & Briefing Técnico */}
				<LevantamentoSection projetoUuid={id} />

				{/* 2 · Sprints & Quadro Kanban de Execução com Drag & Drop (Penpot Board 02) */}
				<div className="rounded-xl border border-slate-800 bg-[#111625] p-5 space-y-4 shadow-sm">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
						<div>
							<div className="flex items-center gap-2">
								<span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold text-[11px] flex items-center justify-center">
									2
								</span>
								<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
									2 · Sprints & Quadro Kanban de Execução com Drag & Drop
								</h3>
							</div>
							<p className="text-[11px] text-slate-400 mt-1">
								Arraste tarefas entre colunas, lance horas gastas inline, acompanhe subtarefas e importe/gere sprints com IA
							</p>
						</div>

						{sprintAtiva && (
							<span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[#14192b] border border-indigo-800/80 text-indigo-300 shrink-0">
								{sprintAtiva.nome.toUpperCase()} ·{" "}
								{sprintAtiva.status === "EM_ANDAMENTO" ? "EM EXECUÇÃO" : sprintAtiva.status}
							</span>
						)}
					</div>

					{sprints.length === 0 ? (
						<div className="rounded-xl border border-dashed border-slate-800 bg-[#0b0f19] p-10 text-center">
							<p className="text-slate-400 text-sm mb-3">
								Nenhuma sprint criada ainda. Importe um JSON gerado por IA ou crie a primeira sprint.
							</p>
							<Button variant="primary" size="sm" onClick={handleNovaSprint}>
								+ Nova sprint
							</Button>
						</div>
					) : (
						<>
							{/* Sprints Tab Bar + Actions (Penpot Board 02) */}
							<div className="rounded-xl border border-slate-800 bg-[#0b0f19] p-2 flex flex-col md:flex-row items-center justify-between gap-3">
								<div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
									{sprints.map((s, idx) => {
										const ativo = sprintAtiva?.uuid === s.uuid;
										return (
											<button
												key={s.uuid}
												type="button"
												onClick={() => setSprintSelecionada(s.uuid)}
												className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
													ativo
														? "bg-[#4f46e5] text-white shadow-xs"
														: "bg-[#14192b] border border-slate-800 text-slate-400 hover:text-slate-200"
												}`}
											>
												<span>{s.status === "CONCLUIDA" ? "✓" : "●"}</span>
												<span>{s.nome}</span>
												<span className="text-[10px] font-mono opacity-80">
													(est. {s.horasEstimadas}h · ⏱ {s.tempoGastoHoras}h)
												</span>
											</button>
										);
									})}
									<button
										type="button"
										onClick={handleNovaSprint}
										className="px-3 py-1.5 rounded-lg border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
									>
										+ Sprint
									</button>
								</div>

								<div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											setPromptCopiado(false);
											setPromptOpen(true);
										}}
										className="text-xs"
									>
										✨ Gerar Prompt p/ IA
									</Button>
									<Button
										variant="primary"
										size="sm"
										onClick={() => {
											setImportErro("");
											setImportOk("");
											setImportOpen(true);
										}}
										className="text-xs"
									>
										{ } Importar JSON
									</Button>
								</div>
							</div>

							{/* Sprint Board Kanban de 4 Colunas */}
							{sprintAtiva && (
								<SprintBoard
									sprint={sprintAtiva}
									projetoLiberado={projeto.contratoAssinado}
									dragTaskUuid={dragTaskUuid}
									dragOverStatus={dragOverStatus}
									onDragStart={setDragTaskUuid}
									onDragEndReset={() => {
										setDragTaskUuid(null);
										setDragOverStatus(null);
									}}
									onDragOverStatus={setDragOverStatus}
									onDrop={handleDrop}
									onNovaTask={() => handleNovaTask(sprintAtiva.uuid)}
									onExcluirTask={handleExcluirTask}
									onNovoItem={handleNovoItem}
									onToggleSubtask={(sid) => toggleSubtaskMutation.mutate(sid)}
									onRemoveSubtask={(sid) => removeSubtaskMutation.mutate(sid)}
									onHorasTask={(taskUuid, horasEstimadas) =>
										taskHorasMutation.mutate({ taskUuid, horasEstimadas })
									}
									onAbrirTask={setTaskDetalheUuid}
									onStatusSprint={(status) =>
										sprintStatusMutation.mutate({
											sprintUuid: sprintAtiva.uuid,
											status,
										})
									}
									onExcluirSprint={() =>
										handleExcluirSprint(sprintAtiva.uuid, sprintAtiva.nome)
									}
								/>
							)}
						</>
					)}
				</div>
			</div>

			{/* Modal de detalhe da task (usado no mobile e ao clicar no card) */}
			{taskDetalheUuid &&
				sprintAtiva &&
				(() => {
					const task = sprintAtiva.tasks.find(
						(t) => t.uuid === taskDetalheUuid,
					);
					if (!task) return null;
					const taskIndex = sprintAtiva.tasks.findIndex((t) => t.uuid === task.uuid);
					const taskCode = `TSK-${String(taskIndex + 1).padStart(3, "0")}`;

					return (
						<TaskDetailModal
							task={task}
							taskCode={taskCode}
							sprintNome={sprintAtiva.nome}
							onClose={() => setTaskDetalheUuid(null)}
							onStatus={(status) =>
								taskStatusMutation.mutate({ taskUuid: task.uuid, status })
							}
							onHorasEstimadas={(h) =>
								taskHorasMutation.mutate({
									taskUuid: task.uuid,
									horasEstimadas: h,
								})
							}
							onTempoGasto={(h) =>
								taskHorasMutation.mutate({
									taskUuid: task.uuid,
									tempoGastoHoras: h,
								})
							}
							onNovoItem={() => handleNovoItem(task.uuid)}
							onToggleSubtask={(sid) => toggleSubtaskMutation.mutate(sid)}
							onRemoveSubtask={(sid) => removeSubtaskMutation.mutate(sid)}
							onExcluir={() => {
								handleExcluirTask(task.uuid, task.nome);
								setTaskDetalheUuid(null);
							}}
						/>
					);
				})()}

			{/* Modal Importar JSON (Penpot Board 03) */}
			{importOpen && (
				<Modal
					onClose={() => setImportOpen(false)}
					titulo="{ } Importar Sprints & Tarefas via JSON"
					subtitulo="Cole o JSON estruturado gerado pela IA para criar Sprints, Tarefas e Subtarefas em lote"
				>
					{importErro && (
						<div className="rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300 font-mono flex items-center gap-2">
							<span className="font-bold">✕</span>
							<span>{importErro}</span>
						</div>
					)}
					{importOk && (
						<div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-300 font-mono flex items-center gap-2">
							<span className="font-bold">✓</span>
							<span>{importOk}</span>
						</div>
					)}

					<div className="flex items-center justify-between gap-2">
						<span className="text-[11px] font-semibold text-slate-300">
							Estrutura JSON das Sprints & Tarefas:
						</span>
						<label className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium flex items-center gap-1">
							<span>📁</span> Carregar arquivo .json
							<input
								type="file"
								accept="application/json,.json"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) file.text().then((t) => setImportText(t));
								}}
								className="hidden"
							/>
						</label>
					</div>

					<textarea
						value={importText}
						onChange={(e) => setImportText(e.target.value)}
						rows={10}
						spellCheck={false}
						placeholder={`{
  "sprints": [
    {
      "nome": "Sprint 2 · Integração PACS & WhatsApp",
      "tarefas": [
        {
          "titulo": "Conector DICOMweb / REST com servidor PACS",
          "horasEstimadas": 20,
          "subtarefas": ["Autenticação mTLS", "Cache PDF"]
        }
      ]
    }
  ]
}`}
						className="w-full resize-y rounded-xl border border-slate-800 bg-[#0b0f19] p-3 font-mono text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none leading-relaxed"
					/>

					{/* Validador dinâmico de schema Penpot */}
					{(() => {
						if (!importText.trim()) return null;
						try {
							const parsed = JSON.parse(importText) as { sprints?: Array<{ nome: string; tarefas?: unknown[]; tasks?: unknown[] }> };
							const sprintsCount = parsed.sprints?.length || 0;
							let tasksCount = 0;
							parsed.sprints?.forEach((s) => {
								tasksCount += (s.tarefas?.length || s.tasks?.length || 0);
							});

							if (sprintsCount > 0) {
								return (
									<div className="rounded-xl border border-emerald-800/80 bg-emerald-950/40 p-3 text-xs text-emerald-300 font-mono">
										✓ JSON válido: {sprintsCount} sprint(s) e {tasksCount} tarefa(s) detectadas.
									</div>
								);
							}
						} catch {
							return (
								<div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-3 text-xs text-rose-300 font-mono">
									✕ Erro de sintaxe no JSON. Revise as vírgulas e aspas.
								</div>
							);
						}
						return null;
					})()}

					<label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer pt-1">
						<input
							type="checkbox"
							checked={importSubstituir}
							onChange={(e) => setImportSubstituir(e.target.checked)}
							className="accent-rose-500 w-4 h-4 rounded cursor-pointer"
						/>
						<span>Substituir sprints existentes neste projeto</span>
					</label>

					<div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
						<Button variant="outline" size="sm" onClick={() => setImportOpen(false)}>
							Cancelar
						</Button>
						<Button
							variant="primary"
							size="sm"
							isLoading={importMutation.isPending}
							disabled={importMutation.isPending || !importText.trim()}
							onClick={() => {
								setImportErro("");
								let parsed: unknown;
								try {
									parsed = JSON.parse(importText);
								} catch {
									setImportErro("JSON inválido. Verifique a sintaxe.");
									return;
								}
								const obj = parsed as Record<string, unknown>;
								const kanban =
									obj && "sprints" in obj ? obj : (obj?.kanban as unknown);
								if (!kanban || typeof kanban !== "object" || !("sprints" in kanban)) {
									setImportErro('Formato esperado: { "sprints": [ ... ] }');
									return;
								}
								importMutation.mutate({ kanban, substituir: importSubstituir });
							}}
						>
							{importMutation.isPending ? "Importando…" : "Importar Sprints"}
						</Button>
					</div>
				</Modal>
			)}

			{/* Modal Gerar Prompt para IA (Penpot Board 03) */}
			{promptOpen && (
				<Modal
					onClose={() => setPromptOpen(false)}
					titulo="✨ Gerador de Prompt para IA (Planejamento de Sprints a partir do Levantamento)"
					subtitulo="Consolida todas as respostas do cliente em /q/$token + schema JSON obrigatório para colar no Claude/Gemini/ChatGPT"
				>
					<div className="space-y-3">
						<div>
							<label
								htmlFor="prompt-contexto"
								className="mb-1 block text-xs font-semibold text-slate-300"
							>
								Contexto Adicional do Sistema (opcional)
							</label>
							<textarea
								id="prompt-contexto"
								value={promptContexto}
								onChange={(e) => setPromptContexto(e.target.value)}
								rows={2}
								placeholder="Ex: O sistema integra com PACS via DICOMweb REST e notifica pacientes via WhatsApp API oficial…"
								className="w-full resize-none rounded-xl border border-slate-800 bg-[#0b0f19] p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
							/>
						</div>

						<div>
							<div className="mb-1.5 flex items-center justify-between">
								<span className="text-xs font-bold text-slate-200">
									Prompt Formatado para Engenharia de Prompt:
								</span>
								<button
									type="button"
									onClick={() => {
										navigator.clipboard?.writeText(promptGerado());
										setPromptCopiado(true);
										setTimeout(() => setPromptCopiado(false), 2000);
									}}
									className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
								>
									{promptCopiado ? "✓ Prompt Copiado!" : "📋 Copiar Prompt"}
								</button>
							</div>
							<textarea
								readOnly
								value={promptGerado()}
								rows={10}
								className="w-full resize-y rounded-xl border border-slate-800 bg-[#0b0f19] p-3 font-mono text-[11px] text-slate-300 focus:outline-none leading-relaxed"
							/>
						</div>

						{/* Fallback de Gate Contratual do Penpot */}
						<div className="rounded-xl border border-amber-800/80 bg-amber-950/40 p-3 space-y-1">
							<span className="text-[10px] font-mono font-bold text-amber-300 uppercase block">
								⏳ Gate Contratual do Projeto:
							</span>
							<p className="text-[11px] text-slate-300 leading-relaxed">
								Você pode gerar o planejamento de sprints agora. A execução formal no Kanban é liberada assim que o contrato for assinado digitalmente em /p/contrato/$token.
							</p>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
							<Button variant="outline" size="sm" onClick={() => setPromptOpen(false)}>
								Fechar
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={() => {
									navigator.clipboard?.writeText(promptGerado());
									setPromptCopiado(true);
									setTimeout(() => setPromptCopiado(false), 2000);
								}}
							>
								{promptCopiado ? "✓ Copiado com Sucesso!" : "📋 Copiar Prompt Completo"}
							</Button>
						</div>
					</div>
				</Modal>
			)}
		</AppShell>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Board de uma sprint (Quadro Kanban com Drag & Drop - Penpot Board 02)
// ──────────────────────────────────────────────────────────────────────

function SprintBoard(props: {
	sprint: KanbanSprint;
	projetoLiberado: boolean;
	dragTaskUuid: string | null;
	dragOverStatus: TaskStatus | null;
	onDragStart: (uuid: string) => void;
	onDragEndReset: () => void;
	onDragOverStatus: (status: TaskStatus | null) => void;
	onDrop: (status: TaskStatus) => void;
	onNovaTask: () => void;
	onExcluirTask: (uuid: string, nome: string) => void;
	onNovoItem: (taskUuid: string) => void;
	onToggleSubtask: (id: number) => void;
	onRemoveSubtask: (id: number) => void;
	onHorasTask: (taskUuid: string, horas: number) => void;
	onAbrirTask: (uuid: string) => void;
	onStatusSprint: (status: SprintStatus) => void;
	onExcluirSprint: () => void;
}) {
	const { sprint } = props;

	return (
		<div className="space-y-4">
			{/* Barra da sprint */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0b0f19] px-4 py-3">
				<div className="flex items-center gap-3">
					<h3 className="text-sm font-bold text-white">{sprint.nome}</h3>
					<span
						className="text-xs font-mono text-indigo-300"
						title="Soma das horas estimadas das tarefas"
					>
						est. {sprint.horasEstimadas}h
					</span>
					<span
						className="text-xs font-mono text-slate-400"
						title="Soma do tempo gasto das tarefas"
					>
						⏱ gasto {sprint.tempoGastoHoras}h
					</span>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={sprint.status}
						onChange={(e) => props.onStatusSprint(e.target.value as SprintStatus)}
						aria-label="Status da Sprint"
						className="text-xs border border-slate-800 rounded-lg px-2.5 py-1.5 bg-[#111625] text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
					>
						<option value="PLANEJAMENTO">Planejamento</option>
						<option value="EM_ANDAMENTO">Em andamento</option>
						<option value="CONCLUIDA">Concluída</option>
						<option value="CANCELADA">Cancelada</option>
					</select>
					<button
						type="button"
						onClick={props.onExcluirSprint}
						title="Excluir sprint"
						className="text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-rose-800 bg-[#111625] cursor-pointer"
					>
						🗑
					</button>
				</div>
			</div>

			{/* 4 Colunas Kanban no Desktop (Penpot Board 02) */}
			<div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
				{COLUNAS.map((col) => {
					const tasks = sprint.tasks.filter((t) => t.status === col.status);
					const totalEst = tasks.reduce((acc, t) => acc + (t.horasEstimadas || 0), 0);
					const totalGasto = tasks.reduce((acc, t) => acc + (t.tempoGastoHoras || 0), 0);
					const ativoDrop = props.dragOverStatus === col.status;

					return (
						<div
							key={col.status}
							onDragOver={(e) => {
								e.preventDefault();
								props.onDragOverStatus(col.status);
							}}
							onDragLeave={() => props.onDragOverStatus(null)}
							onDrop={(e) => {
								e.preventDefault();
								props.onDrop(col.status);
							}}
							className={`rounded-xl border bg-[#0b0f19] overflow-hidden min-h-[360px] flex flex-col transition-all ${
								ativoDrop
									? "border-emerald-500 bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/30"
									: "border-slate-800"
							}`}
						>
							{/* Faixa colorida da coluna (4px) */}
							<div className={`w-full h-1 ${col.barColor}`} />

							{/* Cabeçalho da Coluna Penpot */}
							<div className="p-3 border-b border-slate-800/80 bg-[#111625]">
								<div className="flex items-center justify-between">
									<h4 className="text-xs font-bold text-white tracking-wide">
										{col.titulo} ({tasks.length})
									</h4>
								</div>
								<p className="text-[10px] font-mono text-slate-400 mt-1">
									{totalEst}h est. {totalGasto > 0 ? `· ⏱ ${totalGasto}h gastas` : ""}
								</p>
							</div>

							{/* Área de Tarefas e Dropzone */}
							<div className="p-2.5 space-y-2.5 flex-1">
								{ativoDrop && (
									<div className="p-4 rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-950/30 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2 animate-pulse">
										<span>↓</span> Solte aqui para mover tarefa
									</div>
								)}

								{tasks.map((task, idx) => {
									const taskCode = `TSK-${String(idx + 1).padStart(3, "0")}`;
									return (
										<TaskCard
											key={task.uuid}
											task={task}
											taskCode={taskCode}
											textColor={col.textColor}
											arrastando={props.dragTaskUuid === task.uuid}
											onDragStart={() => props.onDragStart(task.uuid)}
											onDragEnd={props.onDragEndReset}
											onAbrir={() => props.onAbrirTask(task.uuid)}
											onExcluir={() => props.onExcluirTask(task.uuid, task.nome)}
											onNovoItem={() => props.onNovoItem(task.uuid)}
											onToggleSubtask={props.onToggleSubtask}
											onRemoveSubtask={props.onRemoveSubtask}
											onHoras={(h) => props.onHorasTask(task.uuid, h)}
										/>
									);
								})}

								{col.status === "A_FAZER" && (
									<button
										type="button"
										onClick={props.onNovaTask}
										className="w-full py-2 px-3 text-left text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-lg hover:bg-[#14192b] transition-colors border border-dashed border-slate-800 hover:border-slate-700 cursor-pointer flex items-center gap-1.5"
									>
										<span>+</span> Adicionar tarefa
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Lista mobile simplificada */}
			<div className="md:hidden space-y-4">
				{COLUNAS.map((col) => {
					const tasks = sprint.tasks.filter((t) => t.status === col.status);
					if (tasks.length === 0 && col.status === "CANCELADA") return null;
					return (
						<div key={col.status} className="rounded-xl border border-slate-800 bg-[#0b0f19] p-3">
							<div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
								<span className={`w-2.5 h-2.5 rounded-full ${col.barColor}`} />
								<span className="text-xs font-bold text-slate-200">
									{col.titulo} ({tasks.length})
								</span>
							</div>
							<div className="space-y-2">
								{tasks.map((task, idx) => (
									<button
										key={task.uuid}
										type="button"
										onClick={() => props.onAbrirTask(task.uuid)}
										className="w-full text-left rounded-lg border border-slate-800 bg-[#111625] p-3 active:bg-slate-800 transition-colors"
									>
										<div className="flex items-center justify-between gap-2">
											<span className="text-xs font-semibold text-slate-200 flex-1 min-w-0 truncate">
												{task.nome}
											</span>
											<span className="text-xs font-mono text-indigo-400 shrink-0">
												TSK-{idx + 1}
											</span>
										</div>
										<div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-400">
											<span className="text-indigo-300">est. {task.horasEstimadas}h</span>
											<span>⏱ {task.tempoGastoHoras}h</span>
											{task.subtasksCount > 0 && (
												<span>✓ {task.subtasksConcluidas}/{task.subtasksCount}</span>
											)}
										</div>
									</button>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Card de Tarefa (Penpot Board 02)
// ──────────────────────────────────────────────────────────────────────

function TaskCard(props: {
	task: KanbanTask;
	taskCode: string;
	textColor: string;
	arrastando: boolean;
	onDragStart: () => void;
	onDragEnd: () => void;
	onAbrir: () => void;
	onExcluir: () => void;
	onNovoItem: () => void;
	onToggleSubtask: (id: number) => void;
	onRemoveSubtask: (id: number) => void;
	onHoras: (horas: number) => void;
}) {
	const { task, taskCode, textColor } = props;
	const [aberto, setAberto] = useState(false);

	return (
		<div
			draggable
			onDragStart={props.onDragStart}
			onDragEnd={props.onDragEnd}
			className={`rounded-xl border border-slate-800 bg-[#111625] p-3 cursor-grab active:cursor-grabbing transition-all hover:border-slate-700 shadow-2xs ${
				props.arrastando ? "opacity-30 scale-95" : ""
			}`}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
					<span className="text-slate-600 select-none text-xs">⋮⋮</span>
					<span className={textColor}>{taskCode}</span>
				</div>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						props.onExcluir();
					}}
					className="text-slate-500 hover:text-rose-400 text-xs px-1 font-bold cursor-pointer"
					title="Excluir tarefa"
				>
					✕
				</button>
			</div>

			<div
				onClick={props.onAbrir}
				className="text-xs font-semibold text-slate-100 hover:text-indigo-400 transition-colors mt-1.5 cursor-pointer leading-snug"
				title="Clique para editar detalhes"
			>
				{task.nome}
			</div>

			<div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
				<div className="flex items-center gap-2">
					<span className="text-slate-400">Est: {task.horasEstimadas}h</span>
					<label className="text-indigo-300 flex items-center gap-0.5 bg-[#0b0f19] px-1.5 py-0.5 rounded border border-slate-800">
						<span>⏱</span>
						<input
							type="number"
							min={0}
							step={0.5}
							defaultValue={task.tempoGastoHoras}
							onClick={(e) => e.stopPropagation()}
							onBlur={(e) => {
								const v = Number(e.target.value);
								if (!Number.isNaN(v) && v !== task.tempoGastoHoras) props.onHoras(v);
							}}
							className="w-8 text-right bg-transparent text-indigo-300 focus:outline-none"
						/>
						<span>h</span>
					</label>
				</div>

				{task.subtasksCount > 0 && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setAberto((v) => !v);
						}}
						className="text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1"
					>
						<span>{task.subtasksConcluidas}/{task.subtasksCount} subs</span>
						<span>{aberto ? "▲" : "▼"}</span>
					</button>
				)}
			</div>

			{/* Subtarefas expansíveis com checklist */}
			{aberto && task.subtasksCount > 0 && (
				<div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
					{task.subtasks.map((st) => (
						<div
							key={st.id}
							className="flex items-center gap-2 text-[11px] text-slate-300 bg-[#0b0f19] rounded-md px-2 py-1 border border-slate-800/80"
						>
							<input
								type="checkbox"
								checked={st.concluida}
								onClick={(e) => e.stopPropagation()}
								onChange={() => props.onToggleSubtask(st.id)}
								className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
							/>
							<span className={`flex-1 text-[11px] leading-tight ${st.concluida ? "line-through text-slate-500" : ""}`}>
								{st.nome}
							</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									props.onRemoveSubtask(st.id);
								}}
								className="text-slate-500 hover:text-rose-400 text-xs px-1 font-bold cursor-pointer"
							>
								✕
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							props.onNovoItem();
						}}
						className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer pt-0.5 block"
					>
						+ Item
					</button>
				</div>
			)}
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Modal Frame Penpot
// ──────────────────────────────────────────────────────────────────────

function Modal(props: {
	titulo: string;
	subtitulo?: string;
	onClose: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
			<div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#111625] shadow-2xl">
				<div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4 sticky top-0 bg-[#111625] z-10">
					<div>
						<h3 className="text-sm font-bold text-white tracking-tight">{props.titulo}</h3>
						{props.subtitulo && (
							<p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
								{props.subtitulo}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={props.onClose}
						className="rounded-lg p-1 text-slate-400 hover:bg-[#14192b] hover:text-slate-200 transition-colors cursor-pointer"
						aria-label="Fechar"
					>
						✕
					</button>
				</div>
				<div className="space-y-4 px-6 py-5">{props.children}</div>
			</div>
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Modal 1: TaskDetailModal (Penpot Board 03)
// ──────────────────────────────────────────────────────────────────────

function TaskDetailModal(props: {
	task: KanbanTask;
	taskCode: string;
	sprintNome: string;
	onClose: () => void;
	onStatus: (status: TaskStatus) => void;
	onHorasEstimadas: (horas: number) => void;
	onTempoGasto: (horas: number) => void;
	onNovoItem: () => void;
	onToggleSubtask: (id: number) => void;
	onRemoveSubtask: (id: number) => void;
	onExcluir: () => void;
}) {
	const { task, taskCode, sprintNome } = props;
	const [descricao, setDescricao] = useState("Garantir conformidade com os critérios de aceite e logs estruturados.");

	return (
		<Modal
			titulo={`Editar Tarefa · ${taskCode}`}
			subtitulo={`Sprint: ${sprintNome}`}
			onClose={props.onClose}
		>
			<div className="space-y-4">
				{/* Título */}
				<div>
					<label
						htmlFor="td-nome"
						className="mb-1 block text-xs font-semibold text-slate-300 uppercase"
					>
						Título da Tarefa *
					</label>
					<input
						id="td-nome"
						type="text"
						readOnly
						value={task.nome}
						className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs text-white focus:outline-none"
					/>
				</div>

				{/* 3 Colunas: Status + Horas Estimadas + Horas Gastas */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label
							htmlFor="td-status"
							className="mb-1 block text-xs font-semibold text-slate-300 uppercase"
						>
							Status no Kanban
						</label>
						<select
							id="td-status"
							value={task.status}
							onChange={(e) => props.onStatus(e.target.value as TaskStatus)}
							className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
						>
							<option value="A_FAZER">A Fazer</option>
							<option value="EM_ANDAMENTO">Em Andamento</option>
							<option value="CONCLUIDA">Concluída</option>
							<option value="CANCELADA">Cancelada</option>
						</select>
					</div>

					<div>
						<label
							htmlFor="td-est"
							className="mb-1 block text-xs font-semibold text-slate-300 uppercase"
						>
							Horas Estimadas
						</label>
						<input
							id="td-est"
							type="number"
							min={0}
							step={0.5}
							defaultValue={task.horasEstimadas}
							onBlur={(e) => {
								const v = Number(e.target.value);
								if (!Number.isNaN(v) && v !== task.horasEstimadas)
									props.onHorasEstimadas(v);
							}}
							className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 focus:outline-none"
						/>
					</div>

					<div>
						<label
							htmlFor="td-gasto"
							className="mb-1 block text-xs font-semibold text-slate-300 uppercase"
						>
							Horas Gastas (⏱)
						</label>
						<input
							id="td-gasto"
							type="number"
							min={0}
							step={0.5}
							defaultValue={task.tempoGastoHoras}
							onBlur={(e) => {
								const v = Number(e.target.value);
								if (!Number.isNaN(v) && v !== task.tempoGastoHoras)
									props.onTempoGasto(v);
							}}
							className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs font-mono text-slate-200 focus:border-indigo-500 focus:outline-none"
						/>
					</div>
				</div>

				{/* Descrição Técnica */}
				<div>
					<label
						htmlFor="td-desc"
						className="mb-1 block text-xs font-semibold text-slate-300 uppercase"
					>
						Descrição Técnica & Critérios de Pronto
					</label>
					<textarea
						id="td-desc"
						value={descricao}
						onChange={(e) => setDescricao(e.target.value)}
						rows={2}
						className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
					/>
				</div>

				{/* Checklist de Subtarefas Penpot */}
				<div className="space-y-2 pt-1">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
							CHECKLIST DE SUBTAREFAS ({task.subtasksConcluidas}/{task.subtasksCount} CONCLUÍDAS):
						</span>
						<button
							type="button"
							onClick={props.onNovoItem}
							className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
						>
							+ Item
						</button>
					</div>

					{task.subtasks.length === 0 ? (
						<p className="text-[11px] text-slate-500 italic p-3 rounded-lg border border-slate-800 bg-[#0b0f19] text-center">
							Nenhuma subtarefa registrada. Clique em "+ Item" para adicionar.
						</p>
					) : (
						<div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
							{task.subtasks.map((st) => (
								<div
									key={st.id}
									className="flex items-center justify-between gap-2 text-xs text-slate-200 rounded-lg border border-slate-800 bg-[#0b0f19] px-3 py-2"
								>
									<label className="flex items-center gap-2.5 flex-1 cursor-pointer">
										<input
											type="checkbox"
											checked={st.concluida}
											onChange={() => props.onToggleSubtask(st.id)}
											className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
										/>
										<span
											className={`leading-tight ${
												st.concluida ? "line-through text-slate-500" : "text-slate-200"
											}`}
										>
											{st.nome}
										</span>
									</label>
									<button
										type="button"
										onClick={() => props.onRemoveSubtask(st.id)}
										className="text-slate-500 hover:text-rose-400 text-xs px-1 font-bold cursor-pointer"
									>
										✕
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer de ações Penpot */}
				<div className="flex items-center justify-between pt-4 border-t border-slate-800">
					<Button
						type="button"
						variant="danger"
						size="sm"
						onClick={props.onExcluir}
					>
						Excluir Tarefa
					</Button>
					<Button variant="primary" size="sm" onClick={props.onClose}>
						Salvar Alterações
					</Button>
				</div>
			</div>
		</Modal>
	);
}
