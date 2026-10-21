import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import { formatCurrencyBRL } from "#/lib/format";
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
import { getCurrentUserServerFn } from "#/api/auth";
import { projetoKeys } from "#/lib/query-keys";
import { gerarPromptKanban } from "#/lib/kanban-prompt";
import LevantamentoSection from "#/componentes/orquestracao/levantamento-section";

export const Route = createFileRoute("/projetos/$id")({
	beforeLoad: async () => {
		const { user } = await getCurrentUserServerFn();
		if (!user) throw redirect({ to: "/login" });
	},
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

const COLUNAS: { status: TaskStatus; titulo: string; cor: string }[] = [
	{ status: "A_FAZER", titulo: "A Fazer", cor: "bg-slate-500" },
	{ status: "EM_ANDAMENTO", titulo: "Em Andamento", cor: "bg-amber-500" },
	{ status: "CONCLUIDA", titulo: "Concluída", cor: "bg-emerald-500" },
	{ status: "CANCELADA", titulo: "Cancelada", cor: "bg-rose-500" },
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
			badge={projeto.estado}
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
						✨ Gerar prompt
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
						⤴ Importar JSON
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
			<div className="space-y-4">
				{/* Gate de contrato */}
				{projeto.contratoAssinado ? (
					<div className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-300 flex items-center justify-between">
						<span>✓ Contrato assinado — projeto liberado para execução.</span>
						<span className="font-mono font-bold text-slate-200">
							{formatCurrencyBRL(projeto.valorTotalCentavos)}
						</span>
					</div>
				) : (
					<div className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-2.5 text-xs text-amber-300">
						⏳ Projeto ainda não liberado para execução. Você pode planejar o
						Kanban (importar JSON, criar sprints e tarefas), mas a execução só
						começa após a <strong>assinatura do contrato</strong> (página do lead
						→ funil de vendas).
					</div>
				)}

				{/* Levantamento de Requisitos (questionário) */}
				<LevantamentoSection projetoUuid={id} />

				{sprints.length === 0 ? (
					<div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-10 text-center">
						<p className="text-slate-400 text-sm mb-3">
							Nenhuma sprint ainda. Importe um JSON ou crie a primeira sprint.
						</p>
						<Button variant="primary" size="sm" onClick={handleNovaSprint}>
							+ Nova sprint
						</Button>
					</div>
				) : (
					<>
						{/* Abas de sprints */}
						<div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800">
							{sprints.map((s) => {
								const ativo = sprintAtiva?.uuid === s.uuid;
								return (
									<button
										key={s.uuid}
										type="button"
										onClick={() => setSprintSelecionada(s.uuid)}
										className={`shrink-0 px-3 py-2 rounded-t-lg text-xs font-semibold transition-colors border-b-2 ${
											ativo
												? "border-indigo-500 text-slate-100 bg-slate-900"
												: "border-transparent text-slate-400 hover:text-slate-200"
										}`}
									>
										{s.nome}
										<span className="ml-1.5 text-[10px] font-mono text-indigo-300">
											{s.horasEstimadas}h
										</span>
									</button>
								);
							})}
						</div>

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

			{/* Modal de detalhe da task (usado no mobile e ao clicar no card) */}
			{taskDetalheUuid &&
				sprintAtiva &&
				(() => {
					const task = sprintAtiva.tasks.find(
						(t) => t.uuid === taskDetalheUuid,
					);
					if (!task) return null;
					return (
						<TaskDetailModal
							task={task}
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

			{/* Modal Importar JSON */}
			{importOpen && (
				<Modal onClose={() => setImportOpen(false)} titulo="Importar Kanban via JSON">
					{importErro && (
						<div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 whitespace-pre-wrap">
							{importErro}
						</div>
					)}
					{importOk && (
						<div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
							{importOk}
						</div>
					)}
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs font-semibold text-slate-300">
							Cole o JSON ou selecione um arquivo .json
						</span>
						<input
							type="file"
							accept="application/json,.json"
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) file.text().then((t) => setImportText(t));
							}}
							className="text-[11px] text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-slate-200"
						/>
					</div>
					<textarea
						value={importText}
						onChange={(e) => setImportText(e.target.value)}
						rows={12}
						spellCheck={false}
						placeholder={'{ "sprints": [ { "nome": "...", "tasks": [ { "nome": "...", "horasEstimadas": 0.25, "subtasks": [] } ] } ] }'}
						className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
					/>
					<label className="flex items-center gap-2 text-xs text-slate-300">
						<input
							type="checkbox"
							checked={importSubstituir}
							onChange={(e) => setImportSubstituir(e.target.checked)}
							className="accent-rose-500"
						/>
						Substituir sprints existentes
					</label>
					<div className="flex items-center justify-end gap-2 pt-2">
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
							{importMutation.isPending ? "Importando…" : "Importar"}
						</Button>
					</div>
				</Modal>
			)}

			{/* Modal Gerar prompt */}
			{promptOpen && (
				<Modal onClose={() => setPromptOpen(false)} titulo="Gerar prompt para a IA">
					<div>
						<label
							htmlFor="prompt-contexto"
							className="mb-1 block text-xs font-semibold text-slate-300"
						>
							Contexto do sistema
						</label>
						<textarea
							id="prompt-contexto"
							value={promptContexto}
							onChange={(e) => setPromptContexto(e.target.value)}
							rows={3}
							placeholder="O que o sistema faz, módulos, stack…"
							className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
						/>
					</div>
					<div>
						<label
							htmlFor="prompt-local"
							className="mb-1 block text-xs font-semibold text-slate-300"
						>
							Arquivos / documentos de referência
						</label>
						<textarea
							id="prompt-local"
							value={promptLocal}
							onChange={(e) => setPromptLocal(e.target.value)}
							rows={2}
							placeholder="Caminho dos arquivos, repositório, links…"
							className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
						/>
					</div>
					<div>
						<div className="mb-1 flex items-center justify-between">
							<span className="text-xs font-semibold text-slate-300">
								Prompt gerado
							</span>
							<button
								type="button"
								onClick={() => {
									navigator.clipboard?.writeText(promptGerado());
									setPromptCopiado(true);
									setTimeout(() => setPromptCopiado(false), 1500);
								}}
								className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
							>
								{promptCopiado ? "✓ copiado" : "copiar prompt"}
							</button>
						</div>
						<textarea
							readOnly
							value={promptGerado()}
							rows={14}
							className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[11px] text-slate-300 focus:outline-none"
						/>
					</div>
					<div className="flex items-center justify-end gap-2 pt-2">
						<Button variant="outline" size="sm" onClick={() => setPromptOpen(false)}>
							Fechar
						</Button>
						<Button
							variant="primary"
							size="sm"
							onClick={() => {
								navigator.clipboard?.writeText(promptGerado());
								setPromptCopiado(true);
								setTimeout(() => setPromptCopiado(false), 1500);
							}}
						>
							{promptCopiado ? "✓ Copiado" : "Copiar prompt"}
						</Button>
					</div>
				</Modal>
			)}
		</AppShell>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Board de uma sprint (colunas de status, estilo Asana/Trello)
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
		<div className="space-y-3">
			{/* Barra da sprint */}
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5">
				<div className="flex items-center gap-3">
					<h3 className="text-sm font-bold text-slate-100">{sprint.nome}</h3>
					<span
						className="text-[10px] font-mono text-indigo-300"
						title="Soma das horas estimadas das tarefas"
					>
						est. {sprint.horasEstimadas}h
					</span>
					<span
						className="text-[10px] font-mono text-slate-400"
						title="Soma do tempo gasto das tarefas"
					>
						⏱ gasto {sprint.tempoGastoHoras}h
					</span>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={sprint.status}
						onChange={(e) => props.onStatusSprint(e.target.value as SprintStatus)}
						className="text-xs border border-slate-700 rounded px-2 py-1 bg-slate-950 text-slate-200"
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
						className="text-xs text-rose-400 hover:text-rose-300 px-1.5 py-1 rounded border border-transparent hover:border-rose-800"
					>
						🗑
					</button>
				</div>
			</div>

			{/* Colunas de status (desktop) */}
			<div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-3">
				{COLUNAS.map((col) => {
					const tasks = sprint.tasks.filter((t) => t.status === col.status);
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
							className={`rounded-xl border bg-slate-950/40 p-2.5 min-h-[120px] transition-colors ${
								ativoDrop
									? "border-indigo-500 bg-indigo-950/20"
									: "border-slate-800"
							}`}
						>
							<div className="flex items-center justify-between px-1 mb-2">
								<div className="flex items-center gap-2">
									<span className={`w-2 h-2 rounded-full ${col.cor}`} />
									<span className="text-xs font-bold text-slate-200">
										{col.titulo}
									</span>
									<span className="text-[10px] font-mono text-slate-500">
										{tasks.length}
									</span>
								</div>
							</div>

							<div className="space-y-2">
								{tasks.map((task) => (
									<TaskCard
										key={task.uuid}
										task={task}
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
								))}
							</div>

							{col.status === "A_FAZER" && (
								<button
									type="button"
									onClick={props.onNovaTask}
									className="mt-2 w-full text-left text-[11px] text-slate-400 hover:text-slate-200 px-1.5 py-1 rounded hover:bg-slate-800/50"
								>
									+ Adicionar tarefa
								</button>
							)}
						</div>
					);
				})}
			</div>

			{/* Lista agrupada por status (mobile) */}
			<div className="md:hidden space-y-4">
				{COLUNAS.map((col) => {
					const tasks = sprint.tasks.filter((t) => t.status === col.status);
					if (tasks.length === 0 && col.status === "CANCELADA") return null;
					return (
						<div key={col.status}>
							<div className="flex items-center gap-2 px-1 mb-1.5">
								<span className={`w-2 h-2 rounded-full ${col.cor}`} />
								<span className="text-xs font-bold text-slate-200">
									{col.titulo}
								</span>
								<span className="text-[10px] font-mono text-slate-500">
									{tasks.length}
								</span>
							</div>
							<div className="space-y-1.5">
								{tasks.length === 0 ? (
									<p className="text-[11px] text-slate-600 italic px-1">
										Nenhuma tarefa.
									</p>
								) : (
									tasks.map((task) => (
										<button
											key={task.uuid}
											type="button"
											onClick={() => props.onAbrirTask(task.uuid)}
											className="w-full text-left rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 active:bg-slate-800"
										>
											<div className="flex items-center justify-between gap-2">
												<span className="text-xs font-semibold text-slate-200 flex-1 min-w-0 truncate">
													{task.nome}
												</span>
												<span className="text-[10px] font-mono text-slate-500 shrink-0">
													›
												</span>
											</div>
											<div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-slate-500">
												<span className="text-indigo-300">
													est. {task.horasEstimadas}h
												</span>
												<span>⏱ {task.tempoGastoHoras}h</span>
												{task.subtasksCount > 0 && (
													<span>
														✓ {task.subtasksConcluidas}/{task.subtasksCount}
													</span>
												)}
											</div>
										</button>
									))
								)}
							</div>
						</div>
					);
				})}
				<button
					type="button"
					onClick={props.onNovaTask}
					className="w-full text-center text-[11px] text-indigo-300 hover:text-indigo-200 border border-dashed border-slate-700 rounded-lg py-2"
				>
					+ Adicionar tarefa
				</button>
			</div>
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Card de tarefa (arrastável)
// ──────────────────────────────────────────────────────────────────────

function TaskCard(props: {
	task: KanbanTask;
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
	const { task } = props;
	const [aberto, setAberto] = useState(false);

	return (
		<div
			draggable
			onDragStart={props.onDragStart}
			onDragEnd={props.onDragEnd}
			className={`rounded-lg border border-slate-800 bg-slate-900 p-2.5 cursor-grab active:cursor-grabbing transition-opacity ${
				props.arrastando ? "opacity-40" : "hover:border-slate-700"
			}`}
		>
			<div className="flex items-start justify-between gap-2">
				<button
					type="button"
					onClick={props.onAbrir}
					className="text-xs font-semibold text-slate-200 flex-1 min-w-0 text-left hover:text-indigo-300"
					title="Abrir detalhes"
				>
					{task.nome}
				</button>
				<button
					type="button"
					onClick={props.onExcluir}
					className="text-xs text-slate-500 hover:text-rose-400 shrink-0"
					title="Excluir tarefa"
				>
					✕
				</button>
			</div>

			<div className="flex items-center gap-2 mt-1.5">
				<label
					className="text-[10px] font-mono text-indigo-300 flex items-center gap-0.5"
					title="Horas estimadas desta tarefa"
				>
					<input
						type="number"
						min={0}
						step={0.25}
						defaultValue={task.horasEstimadas}
						onClick={(e) => e.stopPropagation()}
						onBlur={(e) => {
							const v = Number(e.target.value);
							if (!Number.isNaN(v) && v !== task.horasEstimadas) props.onHoras(v);
						}}
						className="w-12 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-right text-indigo-300"
					/>
					h
				</label>
				{task.tempoGastoHoras > 0 && (
					<span className="text-[10px] font-mono text-slate-500">
						⏱ {task.tempoGastoHoras}h
					</span>
				)}
				{task.subtasksCount > 0 && (
					<button
						type="button"
						onClick={() => setAberto((v) => !v)}
						className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
					>
						✓ {task.subtasksConcluidas}/{task.subtasksCount}{" "}
						{aberto ? "▲" : "▼"}
					</button>
				)}
			</div>

			{aberto && task.subtasksCount > 0 && (
				<div className="mt-2 space-y-1">
					{task.subtasks.map((st) => (
						<div
							key={st.id}
							className="flex items-center gap-2 text-[11px] text-slate-300"
						>
							<input
								type="checkbox"
								checked={st.concluida}
								onClick={(e) => e.stopPropagation()}
								onChange={() => props.onToggleSubtask(st.id)}
								className="accent-emerald-500"
							/>
							<span className={st.concluida ? "line-through text-slate-500" : ""}>
								{st.nome}
							</span>
							<button
								type="button"
								onClick={() => props.onRemoveSubtask(st.id)}
								className="ml-auto text-slate-600 hover:text-rose-400"
							>
								✕
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={props.onNovoItem}
						className="text-[10px] text-indigo-300 hover:text-indigo-200"
					>
						+ Item
					</button>
				</div>
			)}
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Modal genérico
// ──────────────────────────────────────────────────────────────────────

function Modal(props: {
	titulo: string;
	onClose: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
			<div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
				<div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4 sticky top-0 bg-slate-900">
					<h3 className="text-sm font-bold text-slate-100">{props.titulo}</h3>
					<button
						type="button"
						onClick={props.onClose}
						className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
						aria-label="Fechar"
					>
						✕
					</button>
				</div>
				<div className="space-y-3 px-6 py-5">{props.children}</div>
			</div>
		</div>
	);
}


// ──────────────────────────────────────────────────────────────────────
// Modal de detalhe da task (usado no mobile e ao clicar no card)
// ──────────────────────────────────────────────────────────────────────

function TaskDetailModal(props: {
	task: KanbanTask;
	onClose: () => void;
	onStatus: (status: TaskStatus) => void;
	onHorasEstimadas: (horas: number) => void;
	onTempoGasto: (horas: number) => void;
	onNovoItem: () => void;
	onToggleSubtask: (id: number) => void;
	onRemoveSubtask: (id: number) => void;
	onExcluir: () => void;
}) {
	const { task } = props;
	return (
		<Modal titulo={task.nome} onClose={props.onClose}>
			{/* Status */}
			<div>
				<label
					htmlFor="td-status"
					className="mb-1 block text-xs font-semibold text-slate-300"
				>
					Status
				</label>
				<select
					id="td-status"
					value={task.status}
					onChange={(e) => props.onStatus(e.target.value as TaskStatus)}
					className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
				>
					<option value="A_FAZER">A fazer</option>
					<option value="EM_ANDAMENTO">Em andamento</option>
					<option value="CONCLUIDA">Concluída</option>
					<option value="CANCELADA">Cancelada</option>
				</select>
			</div>

			{/* Horas */}
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label
						htmlFor="td-est"
						className="mb-1 block text-xs font-semibold text-slate-300"
					>
						Horas estimadas
					</label>
					<input
						id="td-est"
						type="number"
						min={0}
						step={0.25}
						defaultValue={task.horasEstimadas}
						onBlur={(e) => {
							const v = Number(e.target.value);
							if (!Number.isNaN(v) && v !== task.horasEstimadas)
								props.onHorasEstimadas(v);
						}}
						className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
					/>
				</div>
				<div>
					<label
						htmlFor="td-gasto"
						className="mb-1 block text-xs font-semibold text-slate-300"
					>
						Tempo gasto (h)
					</label>
					<input
						id="td-gasto"
						type="number"
						min={0}
						step={0.25}
						defaultValue={task.tempoGastoHoras}
						onBlur={(e) => {
							const v = Number(e.target.value);
							if (!Number.isNaN(v) && v !== task.tempoGastoHoras)
								props.onTempoGasto(v);
						}}
						className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
					/>
				</div>
			</div>

			{/* Subtasks */}
			<div>
				<div className="mb-1 flex items-center justify-between">
					<span className="text-xs font-semibold text-slate-300">
						Checklist{" "}
						<span className="font-normal text-slate-500">
							({task.subtasksConcluidas}/{task.subtasksCount})
						</span>
					</span>
					<button
						type="button"
						onClick={props.onNovoItem}
						className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
					>
						+ Item
					</button>
				</div>
				{task.subtasks.length === 0 ? (
					<p className="text-[11px] text-slate-500 italic">
						Nenhum item ainda.
					</p>
				) : (
					<div className="space-y-1.5">
						{task.subtasks.map((st) => (
							<div
								key={st.id}
								className="flex items-center gap-2 text-xs text-slate-300 rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5"
							>
								<input
									type="checkbox"
									checked={st.concluida}
									onChange={() => props.onToggleSubtask(st.id)}
									className="accent-emerald-500"
								/>
								<span
									className={st.concluida ? "line-through text-slate-500" : ""}
								>
									{st.nome}
								</span>
								<button
									type="button"
									onClick={() => props.onRemoveSubtask(st.id)}
									className="ml-auto text-slate-600 hover:text-rose-400"
								>
									✕
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="flex items-center justify-between pt-2 border-t border-slate-800">
				<button
					type="button"
					onClick={props.onExcluir}
					className="text-xs text-rose-400 hover:text-rose-300"
				>
					Excluir tarefa
				</button>
				<Button variant="primary" size="sm" onClick={props.onClose}>
					Fechar
				</Button>
			</div>
		</Modal>
	);
}
