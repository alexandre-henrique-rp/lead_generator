import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import { formatCurrencyBRL, formatDateBR } from "#/lib/format";
import { maskCpfCnpj } from "#/lib/masks";
import { calcularOrcamento } from "#/lib/orcamento-calc";
import {
	getKanbanServerFn,
	getOrcamentoServerFn,
	saveOrcamentoServerFn,
} from "#/api/projetos";
import { getPriceConfigServerFn, type PriceConfig } from "#/api/config";
import {
	gerarContratoServerFn,
	gerarPropostaServerFn,
	listFunilDoLeadServerFn,
	publicarPropostaServerFn,
	regenerarLinkPropostaServerFn,
	uploadSlidePropostaServerFn,
	type FunilProjetoDTO,
} from "#/api/funil";
import { configKeys, funilKeys, projetoKeys } from "#/lib/query-keys";

export default function FunilVendasSection({
	leadUuid,
	onCriarProjeto,
}: {
	leadUuid: string;
	onCriarProjeto: () => void;
}) {
	const funilQuery = useQuery({
		queryKey: funilKeys.byLead(leadUuid),
		queryFn: () => listFunilDoLeadServerFn({ data: { leadUuid } }),
	});

	const projetos = funilQuery.data?.projetos ?? [];

	return (
		<Card
			header={
				<div className="flex items-center justify-between w-full">
					<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
						Projetos & Funil de Vendas
					</h3>
					<Button variant="outline" size="sm" onClick={onCriarProjeto}>
						+ Projeto
					</Button>
				</div>
			}
		>
			{funilQuery.isPending ? (
				<p className="text-xs text-slate-400">Carregando projetos…</p>
			) : projetos.length === 0 ? (
				<div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center">
					<p className="text-xs text-slate-400">
						Nenhum projeto para este lead ainda. Crie um projeto para iniciar o
						funil (orçamento → proposta → contrato).
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{projetos.map((proj) => (
						<ProjetoFunilCard
							key={proj.uuid}
							leadUuid={leadUuid}
							projeto={proj}
						/>
					))}
				</div>
			)}
		</Card>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Card de um projeto com as 3 etapas do funil
// ──────────────────────────────────────────────────────────────────────

function ProjetoFunilCard({
	leadUuid,
	projeto,
}: {
	leadUuid: string;
	projeto: FunilProjetoDTO;
}) {
	const queryClient = useQueryClient();
	const invalidarFunil = () =>
		queryClient.invalidateQueries({ queryKey: funilKeys.byLead(leadUuid) });

	const proposta = projeto.proposta;
	const contrato = projeto.contrato;

	// Gatilhos de habilitação das etapas.
	const podeGerarProposta = projeto.temOrcamento;
	const propostaAceita = proposta?.status === "ACEITA";
	const contratoAssinado = projeto.contratoAssinado;

	const gerarPropostaMutation = useMutation({
		mutationFn: () =>
			gerarPropostaServerFn({ data: { projetoUuid: projeto.uuid } }),
		onSuccess: invalidarFunil,
	});
	const gerarContratoMutation = useMutation({
		mutationFn: () =>
			gerarContratoServerFn({ data: { propostaUuid: proposta?.uuid ?? "" } }),
		onSuccess: invalidarFunil,
	});

	const publicarMutation = useMutation({
		mutationFn: () =>
			publicarPropostaServerFn({ data: { propostaUuid: proposta?.uuid ?? "" } }),
		onSuccess: invalidarFunil,
	});
	const regenerarMutation = useMutation({
		mutationFn: () =>
			regenerarLinkPropostaServerFn({
				data: { propostaUuid: proposta?.uuid ?? "" },
			}),
		onSuccess: invalidarFunil,
	});
	const uploadSlideMutation = useMutation({
		mutationFn: (payload: {
			fileName: string;
			mimeType: string;
			base64: string;
		}) =>
			uploadSlidePropostaServerFn({
				data: { propostaUuid: proposta?.uuid ?? "", ...payload },
			}),
		onSuccess: invalidarFunil,
	});

	const [erro, setErro] = useState("");
	const [enviandoSlide, setEnviandoSlide] = useState(false);

	const origin = typeof window !== "undefined" ? window.location.origin : "";

	async function handleSlide(file: File | undefined) {
		if (!file) return;
		setErro("");
		if (!/pdf/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
			setErro("Envie um arquivo PDF.");
			return;
		}
		if (file.size > 25 * 1024 * 1024) {
			setErro("PDF acima de 25MB.");
			return;
		}
		setEnviandoSlide(true);
		try {
			const base64 = await fileToBase64(file);
			await uploadSlideMutation.mutateAsync({
				fileName: file.name,
				mimeType: "application/pdf",
				base64,
			});
		} catch (e) {
			setErro(e instanceof Error ? e.message : "Erro ao enviar o slide.");
		} finally {
			setEnviandoSlide(false);
		}
	}

	return (
		<div className="rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden">
			{/* Header do projeto */}
			<div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/60">
				<div className="min-w-0">
					<p className="text-sm font-bold text-slate-100 truncate">
						{projeto.nome}
					</p>
					<p className="text-[11px] text-slate-500 font-mono">
						{projeto.estado} ·{" "}
						{formatCurrencyBRL(
							projeto.orcamentoPrecoFinalCentavos ||
								projeto.valorTotalCentavos,
						)}
					</p>
				</div>
				<Link
					to="/projetos/$id"
					params={{ id: projeto.uuid }}
					className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 px-2 py-1 rounded border border-indigo-800/60"
				>
					Abrir projeto →
				</Link>
			</div>

			{/* Trilho de etapas */}
			<div className="px-4 py-3 flex items-center gap-2 text-[10px] font-mono">
				<EtapaPill ok={projeto.temOrcamento} label="Orçamento" />
				<span className="text-slate-600">→</span>
				<EtapaPill
					ok={propostaAceita}
					ativo={!!proposta && !propostaAceita}
					label="Proposta"
				/>
				<span className="text-slate-600">→</span>
				<EtapaPill
					ok={contratoAssinado}
					ativo={!!contrato && !contratoAssinado}
					label="Contrato"
				/>
				<span className="text-slate-600">→</span>
				<EtapaPill ok={contratoAssinado} label="Execução" />
			</div>

			<div className="px-4 pb-4 space-y-4">
				{erro && (
					<div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
						{erro}
					</div>
				)}

				{/* Etapa 1 — Orçamento */}
				<OrcamentoInline
					projetoUuid={projeto.uuid}
					onSaved={invalidarFunil}
				/>

				{/* Etapa 2 — Proposta */}
				<div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
					<div className="flex items-center justify-between gap-2 mb-2">
						<span className="text-xs font-bold text-slate-200">
							2. Proposta comercial
						</span>
						{proposta && (
							<span className="text-[10px] font-mono text-slate-400">
								{proposta.status}
							</span>
						)}
					</div>
					{!proposta ? (
						<div className="flex items-center justify-between gap-2">
							<p className="text-[11px] text-slate-400">
								{podeGerarProposta
									? "Crie a proposta a partir do orçamento (fica em rascunho para você anexar o slide)."
									: "Salve o orçamento antes de criar a proposta."}
							</p>
							<Button
								variant="primary"
								size="sm"
								disabled={!podeGerarProposta || gerarPropostaMutation.isPending}
								isLoading={gerarPropostaMutation.isPending}
								onClick={() => {
									setErro("");
									gerarPropostaMutation.mutate(undefined, {
										onError: (e) =>
											setErro(
												e instanceof Error ? e.message : "Erro ao criar proposta.",
											),
									});
								}}
							>
								Criar proposta (rascunho)
							</Button>
						</div>
					) : (
						<div className="space-y-2.5">
							{/* Slide (upload) — antes de publicar / edição */}
							<div className="rounded border border-slate-800 bg-slate-950/50 p-2.5">
								<div className="flex items-center justify-between gap-2">
									<span className="text-[11px] font-semibold text-slate-300">
										Slide da proposta (PDF)
									</span>
									{proposta.slideUrl ? (
										<span className="text-[10px] text-emerald-400 font-mono">
											✓ {proposta.slideNome}
										</span>
									) : (
										<span className="text-[10px] text-slate-500 font-mono">
											nenhum
										</span>
									)}
								</div>
								{!propostaAceita && (
									<div className="mt-1.5">
										<input
											type="file"
											accept="application/pdf,.pdf"
											disabled={enviandoSlide}
											onChange={(e) => handleSlide(e.target.files?.[0])}
											className="text-[11px] text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-slate-200"
										/>
										{enviandoSlide && (
											<span className="ml-2 text-[10px] text-slate-500">
												enviando…
											</span>
										)}
									</div>
								)}
							</div>

							{/* Publicar / Link / Regenerar */}
							{proposta.status === "RASCUNHO" ? (
								<div className="flex items-center justify-between gap-2">
									<p className="text-[11px] text-slate-400">
										Rascunho — publique para gerar o link do cliente.
									</p>
									<Button
										variant="primary"
										size="sm"
										isLoading={publicarMutation.isPending}
										onClick={() => {
											setErro("");
											publicarMutation.mutate(undefined, {
												onError: (e) =>
													setErro(
														e instanceof Error ? e.message : "Erro ao publicar.",
													),
											});
										}}
									>
										Publicar link
									</Button>
								</div>
							) : (
								<>
									<LinkPublico
										label="Link da proposta"
										url={`${origin}/p/proposta/${proposta.token}`}
									/>
									{propostaAceita ? (
										<p className="text-[11px] text-emerald-400">
											✓ Aceita por {proposta.aceiteNome} (
											{maskCpfCnpj(proposta.aceiteDoc ?? "")}) em{" "}
											{formatDateBR(proposta.aceiteEm, true)} — edição bloqueada.
										</p>
									) : (
										<div className="flex items-center justify-between gap-2">
											<p className="text-[11px] text-amber-400">
												Aguardando aceite do cliente.
											</p>
											<button
												type="button"
												onClick={() => {
													if (
														window.confirm(
															"Regenerar o link invalida o link antigo. Continuar?",
														)
													) {
														setErro("");
														regenerarMutation.mutate(undefined, {
															onError: (e) =>
																setErro(
																	e instanceof Error
																		? e.message
																		: "Erro ao regenerar.",
																),
														});
													}
												}}
												className="text-[10px] text-indigo-300 hover:text-indigo-200 shrink-0"
											>
												{regenerarMutation.isPending
													? "regenerando…"
													: "↻ regenerar link"}
											</button>
										</div>
									)}
								</>
							)}
						</div>
					)}
				</div>

				{/* Etapa 3 — Contrato */}
				<div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
					<div className="flex items-center justify-between gap-2 mb-2">
						<span className="text-xs font-bold text-slate-200">
							3. Contrato (projeto: {projeto.nome})
						</span>
						{contrato && (
							<span className="text-[10px] font-mono text-slate-400">
								{contrato.status}
							</span>
						)}
					</div>
					{!contrato ? (
						<div className="flex items-center justify-between gap-2">
							<p className="text-[11px] text-slate-400">
								{propostaAceita
									? "Gere o contrato deste projeto."
									: "O cliente precisa aceitar a proposta primeiro."}
							</p>
							<Button
								variant="primary"
								size="sm"
								disabled={!propostaAceita || gerarContratoMutation.isPending}
								isLoading={gerarContratoMutation.isPending}
								onClick={() => {
									setErro("");
									gerarContratoMutation.mutate(undefined, {
										onError: (e) =>
											setErro(
												e instanceof Error ? e.message : "Erro ao gerar contrato.",
											),
									});
								}}
							>
								Gerar contrato
							</Button>
						</div>
					) : (
						<div className="space-y-2">
							<LinkPublico
								label="Link do contrato"
								url={`${origin}/p/contrato/${contrato.token}`}
							/>
							{contratoAssinado ? (
								<p className="text-[11px] text-emerald-400">
									✓ Assinado por {contrato.assinaturaNome} (
									{maskCpfCnpj(contrato.assinaturaDoc ?? "")}) em{" "}
									{formatDateBR(contrato.assinaturaEm, true)} — projeto liberado
									para execução.
								</p>
							) : (
								<p className="text-[11px] text-amber-400">
									Aguardando assinatura do cliente.
								</p>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function EtapaPill({
	ok,
	ativo,
	label,
}: {
	ok: boolean;
	ativo?: boolean;
	label: string;
}) {
	const cor = ok
		? "border-emerald-700/60 bg-emerald-950/60 text-emerald-300"
		: ativo
			? "border-amber-700/60 bg-amber-950/50 text-amber-300"
			: "border-slate-700 bg-slate-900 text-slate-500";
	return (
		<span className={`px-2 py-0.5 rounded-full border ${cor}`}>
			{ok ? "✓ " : ""}
			{label}
		</span>
	);
}

function LinkPublico({ label, url }: { label: string; url: string }) {
	const [copiado, setCopiado] = useState(false);
	return (
		<div className="flex items-center gap-2">
			<span className="text-[10px] text-slate-500 shrink-0">{label}:</span>
			<input
				readOnly
				value={url}
				className="flex-1 min-w-0 text-[10px] font-mono bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
			/>
			<button
				type="button"
				onClick={() => {
					navigator.clipboard?.writeText(url);
					setCopiado(true);
					setTimeout(() => setCopiado(false), 1500);
				}}
				className="text-[10px] text-indigo-300 hover:text-indigo-200 shrink-0"
			>
				{copiado ? "✓ copiado" : "copiar"}
			</button>
			<a
				href={url}
				target="_blank"
				rel="noreferrer"
				className="text-[10px] text-indigo-300 hover:text-indigo-200 shrink-0"
			>
				abrir ↗
			</a>
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────
// Orçamento inline (editável dentro do funil do lead)
// ──────────────────────────────────────────────────────────────────────

function OrcamentoInline({
	projetoUuid,
	onSaved,
}: {
	projetoUuid: string;
	onSaved: () => void;
}) {
	const queryClient = useQueryClient();
	const [aberto, setAberto] = useState(false);

	const orcamentoQuery = useQuery({
		queryKey: projetoKeys.orcamento(projetoUuid),
		queryFn: () => getOrcamentoServerFn({ data: { uuid: projetoUuid } }),
		enabled: aberto,
	});
	const priceConfigQuery = useQuery({
		queryKey: configKeys.priceConfig(),
		queryFn: () => getPriceConfigServerFn(),
		staleTime: 60_000,
		enabled: aberto,
	});
	const kanbanQuery = useQuery({
		queryKey: projetoKeys.kanban(projetoUuid),
		queryFn: () => getKanbanServerFn({ data: { uuid: projetoUuid } }),
		enabled: aberto,
	});
	const totalHorasKanban =
		kanbanQuery.data?.kanban?.totalHorasEstimadas ?? 0;

	const carregado = orcamentoQuery.data?.orcamento ?? null;

	const [resumo, setResumo] = useState("");
	const [horas, setHoras] = useState("0");
	const [precoHora, setPrecoHora] = useState(""); // em reais, string; vazio = usar padrão
	const [descontoTipo, setDescontoTipo] = useState<"PERCENTUAL" | "VALOR">(
		"PERCENTUAL",
	);
	const [descontoValor, setDescontoValor] = useState("0");
	const [erro, setErro] = useState("");
	const [okMsg, setOkMsg] = useState("");
	const [hidratado, setHidratado] = useState(false);

	// Hidrata ao abrir.
	if (
		aberto &&
		!hidratado &&
		!orcamentoQuery.isPending &&
		!kanbanQuery.isPending
	) {
		if (carregado) {
			setResumo(carregado.resumo);
			setHoras(
				String(
					carregado.tempoTotalHoras > 0
						? carregado.tempoTotalHoras
						: totalHorasKanban || 0,
				),
			);
			setDescontoTipo(carregado.descontoTipo ?? "PERCENTUAL");
			setDescontoValor(String(carregado.descontoValor ?? 0));
			// Só preenche se o orçamento usou um preço-hora customizado.
			if (
				carregado.precoHoraCentavos &&
				carregado.precoHoraCentavos !== carregado.precoHoraPadraoCentavos
			) {
				setPrecoHora((carregado.precoHoraCentavos / 100).toFixed(2));
			}
		} else {
			setHoras(String(totalHorasKanban || 0));
		}
		setHidratado(true);
	}

	const cfg: PriceConfig | undefined = priceConfigQuery.data?.config;

	const precoHoraCentavos =
		precoHora.trim() !== "" && !Number.isNaN(Number(precoHora))
			? Math.round(Number(precoHora) * 100)
			: undefined;

	const preview = useMemo(() => {
		if (!cfg) return null;
		const h = Number(horas) || 0;
		const dv =
			descontoTipo === "PERCENTUAL"
				? Number(descontoValor) || 0
				: Math.round((Number(descontoValor) || 0) * 100);
		return calcularOrcamento({
			tempoTotalHoras: h,
			custoHoraCentavos: cfg.custoHoraCentavos,
			precoHoraTabelaCentavos:
				precoHoraCentavos ?? cfg.precoHoraTabelaCentavos,
			margemMinima: cfg.margemMinima,
			aliquotaImpostos: cfg.aliquotaImpostos,
			bloqueioPiso: cfg.bloqueioPiso,
			descontoTipo,
			descontoValor: dv,
		});
	}, [cfg, horas, descontoTipo, descontoValor, precoHoraCentavos]);

	const saveMutation = useMutation({
		mutationFn: () =>
			saveOrcamentoServerFn({
				data: {
					projetoUuid,
					resumo: resumo.trim(),
					tempoTotalHoras: Number(horas) || 0,
					descontoTipo,
					descontoValor:
						descontoTipo === "PERCENTUAL"
							? Number(descontoValor) || 0
							: Math.round((Number(descontoValor) || 0) * 100),
					precoHoraCentavos,
				},
			}),
		onSuccess: async () => {
			setErro("");
			setOkMsg("Orçamento salvo.");
			setTimeout(() => setOkMsg(""), 3000);
			await queryClient.invalidateQueries({
				queryKey: projetoKeys.orcamento(projetoUuid),
			});
			onSaved();
		},
		onError: (e: unknown) => {
			setOkMsg("");
			const msg = e instanceof Error ? e.message : "Erro ao salvar.";
			setErro(
				msg.includes("PISO_DE_MARGEM")
					? msg.replace(/^.*PISO_DE_MARGEM:\s*/, "⛔ Bloqueio de margem (G-03): ")
					: msg,
			);
		},
	});

	function handleSalvar() {
		if (!resumo.trim()) {
			setErro("Informe o resumo do que será entregue.");
			return;
		}
		if (preview?.bloqueado) {
			setErro("⛔ Preço final abaixo do piso de margem (G-03).");
			return;
		}
		saveMutation.mutate();
	}

	return (
		<div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
			<button
				type="button"
				onClick={() => setAberto((v) => !v)}
				className="w-full flex items-center justify-between gap-2"
			>
				<span className="text-xs font-bold text-slate-200">
					1. Orçamento {carregado ? "✓" : ""}
				</span>
				<span className="text-[10px] font-mono text-slate-500">
					{aberto ? "▲ fechar" : "▼ editar"}
				</span>
			</button>

			{aberto && (
				<div className="mt-3 space-y-3">
					{erro && (
						<div className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300">
							{erro}
						</div>
					)}
					{okMsg && (
						<div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-300">
							{okMsg}
						</div>
					)}

					<textarea
						value={resumo}
						maxLength={2000}
						rows={2}
						onChange={(e) => setResumo(e.target.value)}
						placeholder="Resumo do que será entregue…"
						className="w-full resize-none rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-200 focus:border-indigo-500 focus:outline-none"
					/>

					<div className="grid grid-cols-3 gap-2">
						<label className="text-[10px] text-slate-400">
							Horas
							<input
								type="number"
								min={0}
								step={0.5}
								value={horas}
								onChange={(e) => setHoras(e.target.value)}
								className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
							/>
						</label>
						<label className="text-[10px] text-slate-400">
							Desconto
							<select
								value={descontoTipo}
								onChange={(e) =>
									setDescontoTipo(e.target.value as "PERCENTUAL" | "VALOR")
								}
								className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-1 py-1 text-[11px] text-slate-200"
							>
								<option value="PERCENTUAL">%</option>
								<option value="VALOR">R$</option>
							</select>
						</label>
						<label className="text-[10px] text-slate-400">
							Valor
							<input
								type="number"
								min={0}
								value={descontoValor}
								onChange={(e) => setDescontoValor(e.target.value)}
								className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
							/>
						</label>
					</div>

					<label className="block text-[10px] text-slate-400">
						Preço por hora (R$) — ajuste o valor final
						<div className="mt-0.5 flex items-center gap-2">
							<input
								type="number"
								min={0}
								step={1}
								value={precoHora}
								onChange={(e) => setPrecoHora(e.target.value)}
								placeholder={
									cfg
										? `padrão ${(cfg.precoHoraTabelaCentavos / 100).toFixed(2)}`
										: "padrão"
								}
								className="w-32 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
							/>
							{precoHora.trim() !== "" && (
								<button
									type="button"
									onClick={() => setPrecoHora("")}
									className="text-[10px] text-slate-500 hover:text-slate-300"
								>
									usar padrão
								</button>
							)}
						</div>
					</label>

					{totalHorasKanban > 0 && (Number(horas) || 0) !== totalHorasKanban && (
						<button
							type="button"
							onClick={() => setHoras(String(totalHorasKanban))}
							className="text-[10px] text-amber-300 hover:text-amber-200"
						>
							⚠ ⤵ usar {totalHorasKanban}h do Kanban
						</button>
					)}

					{preview && (
						<div className="rounded border border-slate-800 bg-slate-950 p-2 space-y-1 font-mono text-[10px]">
							<Row
								label="Preço/hora aplicado"
								valor={formatCurrencyBRL(
									precoHoraCentavos ?? cfg?.precoHoraTabelaCentavos ?? 0,
								)}
							/>
							<Row label="Piso (G-02)" valor={formatCurrencyBRL(preview.pisoCentavos)} />
							<Row
								label="Preço final"
								valor={formatCurrencyBRL(preview.precoFinalCentavos)}
								alerta={preview.abaixoDoPiso}
							/>
							<Row
								label="Lucro estimado"
								valor={formatCurrencyBRL(preview.lucroEstimadoCentavos)}
							/>
						</div>
					)}

					<div className="flex justify-end">
						<Button
							variant="primary"
							size="sm"
							isLoading={saveMutation.isPending}
							disabled={saveMutation.isPending || preview?.bloqueado}
							onClick={handleSalvar}
						>
							Salvar orçamento
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function Row({
	label,
	valor,
	alerta,
}: {
	label: string;
	valor: string;
	alerta?: boolean;
}) {
	return (
		<div className="flex items-center justify-between">
			<span className="text-slate-400">{label}</span>
			<span className={alerta ? "text-rose-300" : "text-slate-200 font-bold"}>
				{valor}
			</span>
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
