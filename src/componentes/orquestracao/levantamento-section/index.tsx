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
	const [aberto, setAberto] = useState(true);

	const q = useQuery({
		queryKey: questionarioKeys.byProjeto(projetoUuid),
		queryFn: () => listQuestionariosServerFn({ data: { projetoUuid } }),
	});

	const questionarios = q.data?.questionarios ?? [];
	const pendente = questionarios.find((x) => x.status === "AGUARDANDO") ?? null;
	const respondidos = questionarios.filter((x) => x.status === "RESPONDIDO");
	const temRespondido = respondidos.length > 0;

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
		<div className="rounded-xl border border-slate-800 bg-[#111625] overflow-hidden shadow-sm">
			<div className="p-4 border-b border-slate-800 flex items-center justify-between">
				<div>
					<div className="flex items-center gap-2">
						<span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold text-[11px] flex items-center justify-center">
							1
						</span>
						<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
							1 · Levantamento de Requisitos & Briefing Técnico (LevantamentoSection)
						</h3>
					</div>
					<p className="text-[11px] text-slate-400 mt-1">
						Links públicos (/q/$token), perguntas suplementares sob medida, respostas concatenadas e anexos enviados pelo cliente
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#14192b] border border-indigo-800/60 text-indigo-300">
						{questionarios.length} QUESTIONÁRIO{questionarios.length === 1 ? "" : "S"} · {respondidos.length} RESPONDIDO{respondidos.length === 1 ? "" : "S"}
					</span>
					<button
						type="button"
						onClick={() => setAberto((v) => !v)}
						className="text-xs text-slate-400 hover:text-slate-200 font-mono px-2 py-1 rounded bg-[#0b0f19] border border-slate-800 cursor-pointer"
					>
						{aberto ? "▲ Recolher" : "▼ Expandir"}
					</button>
				</div>
			</div>

			{aberto && (
				<div className="p-5 bg-[#0b0f19]/60">
					{q.isPending ? (
						<p className="text-xs text-slate-400">Carregando questionários…</p>
					) : questionarios.length === 0 ? (
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-xl border border-dashed border-slate-800 bg-[#111625]/80">
							<div>
								<h4 className="text-sm font-bold text-slate-200">Nenhum questionário gerado ainda</h4>
								<p className="text-xs text-slate-400 mt-0.5">
									Gere o link público do questionário principal para o cliente responder o briefing e anexar arquivos.
								</p>
							</div>
							<Button
								variant="primary"
								size="sm"
								isLoading={gerarMutation.isPending}
								onClick={() => gerarMutation.mutate()}
							>
								Gerar link do questionário →
							</Button>
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
							{/* Coluna Esquerda: Questionários (Principal e Complementares) + Editor */}
							<div className="lg:col-span-5 space-y-4">
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
									<div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-800 bg-[#111625] px-3.5 py-3">
										<p className="text-[11px] text-slate-400 leading-tight">
											Precisa de mais informações? Crie um questionário complementar.
										</p>
										<Button
											variant="outline"
											size="sm"
											isLoading={gerarMutation.isPending}
											onClick={() => gerarMutation.mutate()}
											className="shrink-0 text-xs"
										>
											+ Complementar
										</Button>
									</div>
								)}
								{pendente && (
									<p className="text-[10px] text-amber-400 font-mono">
										⏳ Há um questionário aguardando resposta. O complementar fica liberado após o envio pelo cliente.
									</p>
								)}
							</div>

							{/* Coluna Direita: Respostas Concatenadas do Cliente & Arquivos Anexados */}
							<div className="lg:col-span-7">
								<RespostasConcatenadas
									questionarios={questionarios}
									mapaPergunta={mapaPergunta}
								/>
							</div>
						</div>
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
		<div
			className={`rounded-xl border p-4 space-y-3 transition-colors ${
				respondido
					? "border-emerald-800/80 bg-[#091b15]"
					: "border-amber-800/80 bg-[#1b1509]"
			}`}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-bold text-slate-100">
					{isComplementar
						? `Questionário Complementar ${indice}`
						: "Questionário Principal (Briefing Inicial)"}
				</span>
				<span
					className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${
						respondido
							? "border-[#0d6e4b] bg-[#062e21] text-[#34d399]"
							: "border-amber-700/80 bg-amber-950/80 text-amber-300"
					}`}
				>
					<span
						className={`w-1.5 h-1.5 rounded-full ${
							respondido ? "bg-[#10b981]" : "bg-amber-400"
						}`}
					/>
					{respondido ? "✓ RESPONDIDO" : "⏳ AGUARDANDO"}
				</span>
			</div>

			<div className="flex items-center gap-2">
				<input
					readOnly
					value={url}
					className="flex-1 min-w-0 text-[11px] font-mono bg-[#0b0f19] border border-slate-800 rounded-lg px-2.5 py-2 text-slate-300"
				/>
				<button
					type="button"
					onClick={() => {
						navigator.clipboard?.writeText(url);
						setCopiado(true);
						setTimeout(() => setCopiado(false), 2000);
					}}
					className="px-3 py-2 rounded-lg bg-[#14192b] border border-slate-700 hover:bg-slate-800 text-[11px] font-semibold text-slate-200 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
				>
					{copiado ? "✓ Copiado" : "📋 Copiar Link"}
				</button>
				<a
					href={url}
					target="_blank"
					rel="noreferrer"
					className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition-colors shrink-0 flex items-center gap-1 shadow-xs"
				>
					Abrir link ↗
				</a>
			</div>

			{respondido && (
				<p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
					<span>✓</span> Respondido pelo cliente em {formatDateBR(questionario.respondidoEm, true)} (link público encerrado).
				</p>
			)}

			{/* Editor de suplementares enquanto aguardando resposta */}
			{!respondido && (
				<div className="pt-2 border-t border-slate-800/80 space-y-2">
					<span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
						PERGUNTAS SUPLEMENTARES DESTE QUESTIONÁRIO:
					</span>
					<div className="space-y-1.5">
						{suplementares.length === 0 ? (
							<p className="text-[11px] text-slate-500 italic">
								Nenhuma pergunta suplementar adicionada.
							</p>
						) : (
							suplementares.map((p, i) => (
								<div
									key={`${p}-${i}`}
									className="flex items-center justify-between gap-2 text-xs text-slate-200 rounded-lg border border-slate-800 bg-[#0b0f19] px-3 py-1.5"
								>
									<span className="flex-1 text-[11px] leading-relaxed">
										{i + 1}. {p}
									</span>
									<button
										type="button"
										onClick={() => removeSuplementar(i)}
										className="text-slate-500 hover:text-rose-400 text-xs px-1 font-bold cursor-pointer"
										title="Remover pergunta"
									>
										✕
									</button>
								</div>
							))
						)}
						<div className="flex items-center gap-2 pt-1">
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
								placeholder="Nova pergunta suplementar para o cliente…"
								className="flex-1 text-xs rounded-lg border border-slate-800 bg-[#0b0f19] px-3 py-1.5 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
							/>
							<Button variant="outline" size="sm" onClick={addSuplementar} className="shrink-0 text-xs">
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
	if (respondidos.length === 0) {
		return (
			<div className="rounded-xl border border-slate-800 bg-[#111625] p-6 text-center space-y-2">
				<p className="text-xs text-slate-400 font-mono">
					Nenhuma resposta recebida até o momento.
				</p>
				<p className="text-[11px] text-slate-500">
					Quando o cliente responder ao link público (/q/$token), as respostas e arquivos anexados serão concatenados automaticamente nesta coluna.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-slate-800 bg-[#111625] p-4 space-y-4">
			<span className="text-[10px] font-mono font-black tracking-wider text-[#a5b4fc] uppercase block border-b border-slate-800 pb-2">
				RESPOSTAS CONCATENADAS DO CLIENTE & ARQUIVOS ANEXADOS
			</span>

			<div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
				{respondidos.map((ques, idx) => {
					const r = ques.respostas!;
					return (
						<div key={ques.uuid} className="space-y-2.5">
							{respondidos.length > 1 && (
								<p className="text-[11px] font-bold text-indigo-400 font-mono">
									{idx === 0
										? "• Respostas do Questionário Principal"
										: `• Respostas do Questionário Complementar ${idx}`}
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

							{/* Anexos & Links */}
							{(r.links.length > 0 || ques.arquivos.length > 0) && (
								<div className="rounded-lg border border-slate-800 bg-[#0b0f19] p-3 space-y-2">
									<p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
										ANEXOS & LINKS ENVIADOS PELO CLIENTE:
									</p>
									<div className="flex flex-wrap gap-2">
										{r.links.map((l, i) => (
											<a
												key={`${ques.uuid}-link-${i}`}
												href={l}
												target="_blank"
												rel="noreferrer"
												className="px-2.5 py-1 rounded text-[11px] font-mono bg-[#14192b] border border-slate-800 text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
											>
												<span>🔗</span>
												<span className="truncate max-w-[220px]">{l}</span>
											</a>
										))}
										{ques.arquivos.map((a) => (
											<a
												key={a.uuid}
												href={a.url}
												target="_blank"
												rel="noreferrer"
												className="px-2.5 py-1 rounded text-[11px] font-mono bg-[#14192b] border border-slate-800 text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
												title={a.originalName}
											>
												<span>{a.tipo === "IMAGEM" ? "🖼" : "📄"}</span>
												<span className="truncate max-w-[180px]">{a.originalName}</span>
											</a>
										))}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
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
		<div className="rounded-lg border border-slate-800 bg-[#0b0f19] px-3.5 py-2.5">
			<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
				{pergunta}
			</p>
			<p className="text-xs text-slate-200 whitespace-pre-wrap mt-1 leading-relaxed">
				{resposta || "—"}
			</p>
		</div>
	);
}
