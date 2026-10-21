import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Button from "#/componentes/ux/button";
import {
	getQuestionarioPublicoServerFn,
	responderQuestionarioServerFn,
} from "#/api/questionarios";
import { uploadAnexoQuestionarioServerFn } from "#/api/storage";

export const Route = createFileRoute("/q/$token")({
	component: QuestionarioPublicoPage,
});

function QuestionarioPublicoPage() {
	const { token } = Route.useParams();

	const query = useQuery({
		queryKey: ["questionario-publico", token],
		queryFn: () => getQuestionarioPublicoServerFn({ data: { token } }),
	});

	const [respostas, setRespostas] = useState<Record<string, string>>({});
	const [suplementares, setSuplementares] = useState<Record<number, string>>(
		{},
	);
	const [duvidas, setDuvidas] = useState<
		{ pergunta: string; resposta: string }[]
	>([]);
	const [links, setLinks] = useState<string[]>([""]);
	const [erro, setErro] = useState("");
	const [anexos, setAnexos] = useState<
		{ uuid: string; url: string; tipo: string; nome: string }[]
	>([]);
	const [enviandoAnexo, setEnviandoAnexo] = useState(false);

	const uploadMutation = useMutation({
		mutationFn: (payload: {
			fileName: string;
			mimeType: string;
			base64: string;
		}) => uploadAnexoQuestionarioServerFn({ data: { token, ...payload } }),
	});

	async function handleUpload(files: FileList | null) {
		if (!files || files.length === 0) return;
		setErro("");
		setEnviandoAnexo(true);
		try {
			for (const file of Array.from(files)) {
				if (file.size > 10 * 1024 * 1024) {
					setErro(`"${file.name}" acima de 10MB.`);
					continue;
				}
				const base64 = await fileToBase64(file);
				const res = await uploadMutation.mutateAsync({
					fileName: file.name,
					mimeType: file.type || "application/octet-stream",
					base64,
				});
				setAnexos((a) => [
					...a,
					{ uuid: res.uuid, url: res.url, tipo: res.tipo, nome: file.name },
				]);
			}
		} catch (e) {
			setErro(e instanceof Error ? e.message : "Erro ao enviar anexo.");
		} finally {
			setEnviandoAnexo(false);
		}
	}

	const q = query.data?.questionario ?? null;

	const responder = useMutation({
		mutationFn: () =>
			responderQuestionarioServerFn({
				data: {
					token,
					respostas,
					suplementares: (q?.perguntasSuplementares ?? []).map((p, i) => ({
						pergunta: p,
						resposta: suplementares[i] ?? "",
					})),
					duvidas,
					links,
				},
			}),
		onSuccess: () => {
			setErro("");
			query.refetch();
		},
		onError: (e: unknown) =>
			setErro(e instanceof Error ? e.message : "Erro ao enviar."),
	});

	const blocos = useMemo(() => {
		if (!q) return [];
		const ordem: string[] = [];
		const map = new Map<string, typeof q.perguntasPadrao>();
		for (const p of q.perguntasPadrao) {
			if (!map.has(p.bloco)) {
				map.set(p.bloco, []);
				ordem.push(p.bloco);
			}
			map.get(p.bloco)?.push(p);
		}
		return ordem.map((b) => ({ bloco: b, perguntas: map.get(b) ?? [] }));
	}, [q]);

	if (query.isPending) {
		return (
			<Centralizado>
				<p className="text-sm text-slate-500">Carregando questionário…</p>
			</Centralizado>
		);
	}

	if (!q) {
		return (
			<Centralizado>
				<div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
					!
				</div>
				<h2 className="text-xl font-bold text-slate-900">
					Link inválido ou expirado
				</h2>
				<p className="text-xs text-slate-500">
					Entre em contato conosco se acredita que isso é um erro.
				</p>
			</Centralizado>
		);
	}

	if (q.status === "RESPONDIDO" || responder.isSuccess) {
		return (
			<Centralizado>
				<div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
					✓
				</div>
				<h2 className="text-xl font-bold text-slate-900">
					Questionário enviado!
				</h2>
				<p className="text-xs text-slate-500">
					Recebemos suas respostas. Nossa equipe vai analisar e entrará em
					contato em breve.
				</p>
			</Centralizado>
		);
	}

	function setResp(chave: string, valor: string) {
		setRespostas((r) => ({ ...r, [chave]: valor }));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		// Valida obrigatórias
		const faltando = q!.perguntasPadrao.filter(
			(p) => p.obrigatorio && !(respostas[p.chave] ?? "").trim(),
		);
		if (faltando.length > 0) {
			setErro(`Responda as perguntas obrigatórias (${faltando.length} faltando).`);
			return;
		}
		setErro("");
		responder.mutate();
	}

	return (
		<div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-10 px-4 sm:px-6">
			<form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
				<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base">
							K
						</div>
						<div>
							<h1 className="text-base font-bold text-slate-900">
								Questionário — {q.projetoNome}
							</h1>
							<p className="text-xs text-slate-500">
								Preencha para começarmos o projeto. As perguntas finais são
								livres — tire suas dúvidas!
							</p>
						</div>
					</div>
				</div>

				{erro && (
					<div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl px-4 py-2.5">
						{erro}
					</div>
				)}

				{/* Blocos de perguntas padrão */}
				{blocos.map(({ bloco, perguntas }) => (
					<div
						key={bloco}
						className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
					>
						<h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
							{bloco}
						</h2>
						{perguntas.map((p) => (
							<div key={p.chave}>
								<label
									htmlFor={`q-${p.chave}`}
									className="block text-xs font-semibold text-slate-700 mb-1"
								>
									{p.pergunta}
									{p.obrigatorio && <span className="text-rose-500"> *</span>}
								</label>
								{p.tipo === "SELECT" ? (
									<select
										id={`q-${p.chave}`}
										value={respostas[p.chave] ?? ""}
										onChange={(e) => setResp(p.chave, e.target.value)}
										className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none"
									>
										<option value="">Selecione…</option>
										{(p.opcoes ?? []).map((o) => (
											<option key={o} value={o}>
												{o}
											</option>
										))}
									</select>
								) : p.tipo === "TEXTO_LONGO" ? (
									<textarea
										id={`q-${p.chave}`}
										value={respostas[p.chave] ?? ""}
										onChange={(e) => setResp(p.chave, e.target.value)}
										rows={3}
										className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none resize-none"
									/>
								) : (
									<input
										id={`q-${p.chave}`}
										type="text"
										value={respostas[p.chave] ?? ""}
										onChange={(e) => setResp(p.chave, e.target.value)}
										className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none"
									/>
								)}
							</div>
						))}
					</div>
				))}

				{/* Suplementares */}
				{q.perguntasSuplementares.length > 0 && (
					<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
						<h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
							Perguntas complementares
						</h2>
						{q.perguntasSuplementares.map((p, i) => (
							<div key={`${p}-${i}`}>
								<label
									htmlFor={`sup-${i}`}
									className="block text-xs font-semibold text-slate-700 mb-1"
								>
									{p}
								</label>
								<textarea
									id={`sup-${i}`}
									value={suplementares[i] ?? ""}
									onChange={(e) =>
										setSuplementares((s) => ({ ...s, [i]: e.target.value }))
									}
									rows={2}
									className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none resize-none"
								/>
							</div>
						))}
					</div>
				)}

				{/* Links */}
				<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
					<h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
						Links de referência (opcional)
					</h2>
					{links.map((l, i) => (
						<div key={`link-${i}`} className="flex items-center gap-2">
							<input
								type="url"
								value={l}
								onChange={(e) =>
									setLinks((arr) =>
										arr.map((x, idx) => (idx === i ? e.target.value : x)),
									)
								}
								placeholder="https://…"
								className="flex-1 text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none"
							/>
							{links.length > 1 && (
								<button
									type="button"
									onClick={() =>
										setLinks((arr) => arr.filter((_, idx) => idx !== i))
									}
									className="text-xs text-rose-500"
								>
									✕
								</button>
							)}
						</div>
					))}
					<button
						type="button"
						onClick={() => setLinks((arr) => [...arr, ""])}
						className="text-xs text-indigo-600 hover:text-indigo-500"
					>
						+ Adicionar link
					</button>
				</div>

				{/* Anexos (upload) */}
				<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
					<h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
						Anexos (opcional)
					</h2>
					<p className="text-[11px] text-slate-500">
						Imagens ou documentos (máx. 10MB cada).
					</p>
					<input
						type="file"
						multiple
						accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
						onChange={(e) => handleUpload(e.target.files)}
						disabled={enviandoAnexo}
						className="text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-slate-800"
					/>
					{enviandoAnexo && (
						<p className="text-[11px] text-slate-500">Enviando…</p>
					)}
					{anexos.length > 0 && (
						<div className="flex flex-wrap gap-2 pt-1">
							{anexos.map((a) =>
								a.tipo === "IMAGEM" ? (
									<img
										key={a.uuid}
										src={a.url}
										alt={a.nome}
										title={a.nome}
										className="h-16 w-16 object-cover rounded border border-slate-200"
									/>
								) : (
									<span
										key={a.uuid}
										className="text-[11px] text-slate-700 border border-slate-200 rounded px-2 py-1"
									>
										📄 {a.nome}
									</span>
								),
							)}
						</div>
					)}
				</div>

				{/* Dúvidas do cliente */}
				<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
					<h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
						Suas dúvidas (opcional)
					</h2>
					{duvidas.map((d, i) => (
						<div
							key={`duv-${i}`}
							className="rounded-lg border border-slate-200 p-3 space-y-2"
						>
							<input
								type="text"
								value={d.pergunta}
								onChange={(e) =>
									setDuvidas((arr) =>
										arr.map((x, idx) =>
											idx === i ? { ...x, pergunta: e.target.value } : x,
										),
									)
								}
								placeholder="Sua dúvida…"
								className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none"
							/>
							<textarea
								value={d.resposta}
								onChange={(e) =>
									setDuvidas((arr) =>
										arr.map((x, idx) =>
											idx === i ? { ...x, resposta: e.target.value } : x,
										),
									)
								}
								rows={2}
								placeholder="Detalhes / contexto…"
								className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none resize-none"
							/>
							<button
								type="button"
								onClick={() =>
									setDuvidas((arr) => arr.filter((_, idx) => idx !== i))
								}
								className="text-xs text-rose-500"
							>
								Remover
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={() =>
							setDuvidas((arr) => [...arr, { pergunta: "", resposta: "" }])
						}
						className="text-xs text-indigo-600 hover:text-indigo-500"
					>
						+ Adicionar dúvida
					</button>
				</div>

				<div className="flex justify-end">
					<Button
						type="submit"
						variant="primary"
						size="md"
						isLoading={responder.isPending}
					>
						Enviar questionário →
					</Button>
				</div>

				<p className="text-center text-[11px] text-slate-400">
					🔒 Seus dados estão seguros. Não compartilhamos com terceiros.
				</p>
			</form>
		</div>
	);
}

function Centralizado({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-16 px-4 text-center">
			<div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
				{children}
			</div>
		</div>
	);
}

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = String(reader.result ?? "");
			const comma = result.indexOf(",");
			resolve(comma >= 0 ? result.slice(comma + 1) : result);
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}
