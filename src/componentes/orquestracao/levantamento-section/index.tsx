import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "#/componentes/ux/button";
import { formatDateBR } from "#/lib/format";
import {
	gerarQuestionarioServerFn,
	listQuestionariosServerFn,
	salvarSuplementaresServerFn,
	type QuestionarioDTO,
} from "#/api/questionarios";
import { QUESTIONARIO_TEMPLATE } from "#/lib/questionario-template";
import { questionarioKeys } from "#/lib/query-keys";

export default function LevantamentoSection({
	projetoUuid,
}: {
	projetoUuid: string;
}) {
	const queryClient = useQueryClient();
	const [aberto, setAberto] = useState(false);

	const q = useQuery({
		queryKey: questionarioKeys.byProjeto(projetoUuid),
		queryFn: () => listQuestionariosServerFn({ data: { projetoUuid } }),
		enabled: aberto,
	});

	const questionarios = q.data?.questionarios ?? [];
	const pendente = questionarios.find((x) => x.status === "AGUARDANDO") ?? null;
	const temRespondido = questionarios.some((x) => x.status === "RESPONDIDO");

	const invalidar = () =>
		queryClient.invalidateQueries({
			queryKey: questionarioKeys.byProjeto(projetoUuid),
		});

	const gerarMutation = useMutation({
		mutationFn: () => gerarQuestionarioServerFn({ data: { projetoUuid } }),
		onSuccess: invalidar,
	});

	const mapaPergunta = new Map(
		QUESTIONARIO_TEMPLATE.map((p) => [p.chave, p.pergunta]),
	);

	return (
		<div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
			<button
				type="button"
				onClick={() => setAberto((v) => !v)}
				className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
			>
				<div className="flex items-center gap-3">
					<span className="w-6 h-6 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-bold text-xs flex items-center justify-center">
						1
					</span>
					<span className="font-bold text-sm text-slate-100">
						Levantamento de Requisitos
					</span>
					{aberto && questionarios.length > 0 && (
						<span className="text-[10px] font-mono text-slate-500">
							{questionarios.length} question
							{questionarios.length === 1 ? "ário" : "ários"}
						</span>
					)}
				</div>
				<span className="text-xs text-slate-500 font-mono">
					{aberto ? "▲ Fechar" : "▼ Expandir"}
				</span>
			</button>

			{aberto && (
				<div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-5">
					{q.isPending ? (
						<p className="text-xs text-slate-400">Carregando…</p>
					) : questionarios.length === 0 ? (
						<div className="flex items-center justify-between gap-3">
							<p className="text-xs text-slate-400">
								Gere um link de questionário para o cliente coletar os
								requisitos.
							</p>
							<Button
								variant="primary"
								size="sm"
								isLoading={gerarMutation.isPending}
								onClick={() => gerarMutation.mutate()}
							>
								Gerar link do questionário
							</Button>
						</div>
					) : (
						<>
							{/* Lista de questionários (principal + complementares) */}
							<div className="space-y-3">
								{questionarios.map((ques, i) => (
									<QuestionarioItem
										key={ques.uuid}
										projetoUuid={projetoUuid}
										questionario={ques}
										indice={i}
										isComplementar={i > 0}
									/>
								))}
							</div>

							{/* Gerar complementar: só se não há pendente e já há respondido */}
							{!pendente && temRespondido && (
								<div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-3 py-2.5">
									<p className="text-[11px] text-slate-400">
										Precisa de mais informações? Gere um questionário
										complementar com novas perguntas.
									</p>
									<Button
										variant="outline"
										size="sm"
										isLoading={gerarMutation.isPending}
										onClick={() => gerarMutation.mutate()}
									>
										+ Novo questionário complementar
									</Button>
								</div>
							)}
							{pendente && (
								<p className="text-[11px] text-amber-400">
									Há um questionário aguardando resposta. O complementar fica
									disponível após o cliente responder.
								</p>
							)}

							{/* Respostas concatenadas de TODOS os questionários */}
							<RespostasConcatenadas
								questionarios={questionarios}
								mapaPergunta={mapaPergunta}
							/>
						</>
					)}
				</div>
			)}
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Item de um questionário: link + status + editor de suplementares
// ──────────────────────────────────────────────────────────────────────

function QuestionarioItem({
	projetoUuid,
	questionario,
	indice,
	isComplementar,
}: {
	projetoUuid: string;
	questionario: QuestionarioDTO;
	indice: number;
	isComplementar: boolean;
}) {
	const queryClient = useQueryClient();
	const respondido = questionario.status === "RESPONDIDO";
	const origin = typeof window !== "undefined" ? window.location.origin : "";
	const url = `${origin}/q/${questionario.token}`;
	const [copiado, setCopiado] = useState(false);

	const [suplementares, setSuplementares] = useState<string[]>(
		questionario.perguntasSuplementares,
	);
	const [novaPergunta, setNovaPergunta] = useState("");

	const salvarMutation = useMutation({
		mutationFn: (perguntas: string[]) =>
			salvarSuplementaresServerFn({
				data: { questionarioUuid: questionario.uuid, perguntas },
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: questionarioKeys.byProjeto(projetoUuid),
			}),
	});

	function addSuplementar() {
		const p = novaPergunta.trim();
		if (!p) return;
		const novo = [...suplementares, p];
		setSuplementares(novo);
		setNovaPergunta("");
		salvarMutation.mutate(novo);
	}
	function removeSuplementar(i: number) {
		const novo = suplementares.filter((_, idx) => idx !== i);
		setSuplementares(novo);
		salvarMutation.mutate(novo);
	}

	return (
		<div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-bold text-slate-200">
					{isComplementar
						? `Questionário complementar ${indice}`
						: "Questionário principal"}
				</span>
				<span
					className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
						respondido
							? "border-emerald-700/60 bg-emerald-950/60 text-emerald-300"
							: "border-amber-700/60 bg-amber-950/50 text-amber-300"
					}`}
				>
					{respondido ? "✓ Respondido" : "Aguardando"}
				</span>
			</div>

			<div className="flex items-center gap-2">
				<input
					readOnly
					value={url}
					className="flex-1 min-w-0 text-[11px] font-mono bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300"
				/>
				<button
					type="button"
					onClick={() => {
						navigator.clipboard?.writeText(url);
						setCopiado(true);
						setTimeout(() => setCopiado(false), 1500);
					}}
					className="text-[11px] text-indigo-300 hover:text-indigo-200 shrink-0"
				>
					{copiado ? "✓ copiado" : "copiar"}
				</button>
				<a
					href={url}
					target="_blank"
					rel="noreferrer"
					className="text-[11px] text-indigo-300 hover:text-indigo-200 shrink-0"
				>
					abrir ↗
				</a>
			</div>

			{respondido && (
				<p className="text-[11px] text-emerald-400">
					✓ Respondido em {formatDateBR(questionario.respondidoEm, true)} (link
					desativado).
				</p>
			)}

			{/* Editor de suplementares só enquanto aguardando resposta */}
			{!respondido && (
				<div className="pt-1">
					<span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
						Perguntas deste questionário (além das padrão)
					</span>
					<div className="space-y-1.5">
						{suplementares.map((p, i) => (
							<div
								key={`${p}-${i}`}
								className="flex items-center gap-2 text-xs text-slate-300 rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5"
							>
								<span className="flex-1">{p}</span>
								<button
									type="button"
									onClick={() => removeSuplementar(i)}
									className="text-slate-600 hover:text-rose-400"
								>
									✕
								</button>
							</div>
						))}
						<div className="flex items-center gap-2">
							<input
								type="text"
								value={novaPergunta}
								onChange={(e) => setNovaPergunta(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addSuplementar();
									}
								}}
								placeholder="Nova pergunta…"
								className="flex-1 text-xs rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
							/>
							<Button variant="outline" size="sm" onClick={addSuplementar}>
								+ Add
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Respostas concatenadas de todos os questionários respondidos
// ──────────────────────────────────────────────────────────────────────

function RespostasConcatenadas({
	questionarios,
	mapaPergunta,
}: {
	questionarios: QuestionarioDTO[];
	mapaPergunta: Map<string, string>;
}) {
	const respondidos = questionarios.filter(
		(q) => q.status === "RESPONDIDO" && q.respostas,
	);
	if (respondidos.length === 0) return null;

	return (
		<div className="space-y-3">
			<span className="text-[10px] uppercase tracking-wider text-slate-500 block">
				Respostas do cliente
			</span>
			{respondidos.map((ques, idx) => {
				const r = ques.respostas!;
				return (
					<div key={ques.uuid} className="space-y-2">
						{respondidos.length > 1 && (
							<p className="text-[11px] font-semibold text-indigo-300">
								{idx === 0
									? "Questionário principal"
									: `Questionário complementar ${idx}`}
							</p>
						)}
						{Object.entries(r.respostas).map(([chave, valor]) => (
							<RespostaItem
								key={`${ques.uuid}-${chave}`}
								pergunta={mapaPergunta.get(chave) ?? chave}
								resposta={valor}
							/>
						))}
						{r.suplementares.map((s, i) => (
							<RespostaItem
								key={`${ques.uuid}-sup-${i}`}
								pergunta={`[Complementar] ${s.pergunta}`}
								resposta={s.resposta}
							/>
						))}
						{r.duvidas.length > 0 &&
							r.duvidas.map((d, i) => (
								<RespostaItem
									key={`${ques.uuid}-duv-${i}`}
									pergunta={`[Dúvida do cliente] ${d.pergunta}`}
									resposta={d.resposta}
								/>
							))}
						{r.links.length > 0 && (
							<div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
								<p className="text-[11px] font-semibold text-slate-400 mb-1">
									Links enviados
								</p>
								<ul className="space-y-1">
									{r.links.map((l, i) => (
										<li key={`${ques.uuid}-link-${i}`}>
											<a
												href={l}
												target="_blank"
												rel="noreferrer"
												className="text-[11px] text-indigo-300 hover:text-indigo-200 break-all"
											>
												{l}
											</a>
										</li>
									))}
								</ul>
							</div>
						)}
						{ques.arquivos.length > 0 && (
							<div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
								<p className="text-[11px] font-semibold text-slate-400 mb-1">
									Anexos
								</p>
								<div className="flex flex-wrap gap-2">
									{ques.arquivos.map((a) =>
										a.tipo === "IMAGEM" ? (
											<a
												key={a.uuid}
												href={a.url}
												target="_blank"
												rel="noreferrer"
												title={a.originalName}
											>
												<img
													src={a.url}
													alt={a.originalName}
													className="h-20 w-20 object-cover rounded border border-slate-800"
												/>
											</a>
										) : (
											<a
												key={a.uuid}
												href={a.url}
												target="_blank"
												rel="noreferrer"
												className="text-[11px] text-indigo-300 hover:text-indigo-200 border border-slate-800 rounded px-2 py-1"
											>
												📄 {a.originalName}
											</a>
										),
									)}
								</div>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

function RespostaItem({
	pergunta,
	resposta,
}: {
	pergunta: string;
	resposta: string;
}) {
	return (
		<div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
			<p className="text-[11px] font-semibold text-slate-400">{pergunta}</p>
			<p className="text-xs text-slate-200 whitespace-pre-wrap mt-0.5">
				{resposta || "—"}
			</p>
		</div>
	);
}
