import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Check,
	RefreshCw,
	Save,
	Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import {
	gerarMensagemServerFn,
	type MensagemGerada,
	type OportunidadeTi,
	salvarMensagemLeadServerFn,
} from "#/lib/ai-message";
import { onlyDigits } from "#/lib/masks";
import { interacaoKeys, leadKeys } from "#/lib/query-keys";

export interface EnviarMensagemSectionProps {
	leadUuid: string;
	leadNome: string;
	telefoneCelular: string | null | undefined;
	telefoneFixo: string | null | undefined;
	email?: string | null | undefined;
	cidade?: string | null | undefined;
	uf?: string | null | undefined;
	/** Valores persistidos no banco de dados para restauração */
	mensagemSalva?: string | null;
	assuntoSalvo?: string | null;
	canalSalvo?: "WHATSAPP" | "EMAIL" | null;
	oportunidadesSalvas?: string | null;
	/** Sincronização de oportunidades com o componente pai */
	onSyncOutreach?: (dados: {
		canal: "WHATSAPP";
		mensagem: string;
		assunto: string;
		html: string;
		oportunidades: OportunidadeTi[];
	}) => void;
}

type Estado = "ocioso" | "gerando" | "pronto" | "erro";

export default function EnviarMensagemSection({
	leadUuid,
	leadNome,
	telefoneCelular,
	telefoneFixo,
	cidade,
	uf,
	mensagemSalva,
	oportunidadesSalvas,
	onSyncOutreach,
}: EnviarMensagemSectionProps) {
	const queryClient = useQueryClient();

	const defaultOportunidades: OportunidadeTi[] = [
		{
			titulo: "Portal de Laudos Online + Entrega Automática via WhatsApp",
			prioridade: "PRINCIPAL",
			dor: "Pacientes ligam cobrando resultado de exame",
			servico: "Portal Web de Laudos",
			ganho: "-65% de chamadas na recepção em 30 dias",
		},
		{
			titulo: "Bot de Confirmação de Agenda & Preparo de Exames",
			prioridade: "ENTRADA",
			dor: "Absenteísmo (no-show) de 18% em ressonâncias",
			servico: "Bot de Confirmação WhatsApp",
			ganho: "Confirmação ativa 24h antes + fila de encaixe",
		},
		{
			titulo: "Painel BI de Produtividade por Equipamento e Convênio",
			prioridade: "EXPANSAO",
			dor: "Fechamento manual em planilhas no fim do mês",
			servico: "Dashboard de Gestão e BI",
			ganho: "Visão em tempo real de glosas e ocupação",
		},
	];

	const defaultMensagem = `Olá, equipe da ${leadNome}! Aqui é o Alex, da King Dev.\nVi que vocês atendem na região de ${cidade || "Curitiba"}${uf ? `/${uf}` : ""} com foco em serviços especializados.\nDesenvolvemos um módulo que automatiza a entrega de laudos e a confirmação de agenda no WhatsApp, reduzindo em até 65% as ligações na recepção.\nFaz sentido te mandar um vídeo de 2 min mostrando como funciona na prática?`;

	// Inicialização a partir do banco de dados quando disponível
	const opsIniciais = useMemo(() => {
		if (oportunidadesSalvas) {
			try {
				const parsed = JSON.parse(oportunidadesSalvas);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			} catch {
				// fallback
			}
		}
		return defaultOportunidades;
	}, [oportunidadesSalvas]);

	const [estado, setEstado] = useState<Estado>("pronto");
	const [analise, setAnalise] = useState("");
	const [mensagem, setMensagem] = useState(mensagemSalva || defaultMensagem);
	const [oportunidades, setOportunidades] = useState<OportunidadeTi[]>(opsIniciais);
	const [erro, setErro] = useState("");
	const [sucessoMsg, setSucessoMsg] = useState("");
	const [modelo, setModelo] = useState("gemini-3.5-flash-lite");

	const whatsappDigits =
		onlyDigits(telefoneCelular) || onlyDigits(telefoneFixo);
	const podeGerar = Boolean(whatsappDigits);

	// Notifica o componente pai sobre as oportunidades de TI
	useEffect(() => {
		if (onSyncOutreach) {
			onSyncOutreach({
				canal: "WHATSAPP",
				mensagem,
				assunto: "",
				html: "",
				oportunidades,
			});
		}
	}, [mensagem, oportunidades, onSyncOutreach]);

	// Mutação para geração com Gemini (Canal WhatsApp)
	const gerar = useMutation({
		mutationFn: async (vars: { mensagemAtual?: string }) => {
			return gerarMensagemServerFn({
				data: {
					leadUuid,
					mensagemAtual: vars.mensagemAtual,
					canal: "WHATSAPP",
				},
			});
		},
		onMutate: () => {
			setEstado("gerando");
			setErro("");
			setSucessoMsg("");
		},
		onSuccess: (resp: MensagemGerada) => {
			setAnalise(resp.analise);
			setMensagem(resp.mensagem);
			if (resp.oportunidades?.length) setOportunidades(resp.oportunidades);
			setModelo(resp.modelo);
			setEstado("pronto");
		},
		onError: (e: unknown) => {
			setErro(e instanceof Error ? e.message : "Erro ao gerar mensagem de WhatsApp.");
			setEstado("erro");
		},
	});

	// Mutação para salvar a mensagem de WhatsApp no banco
	const salvarMutation = useMutation({
		mutationFn: async () => {
			return salvarMensagemLeadServerFn({
				data: {
					leadUuid,
					canal: "WHATSAPP",
					mensagem,
					oportunidades,
					registrarHistorico: true,
				},
			});
		},
		onSuccess: async () => {
			setSucessoMsg("Mensagem de WhatsApp salva no banco de dados com sucesso!");
			setTimeout(() => setSucessoMsg(""), 4000);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadUuid) }),
				queryClient.invalidateQueries({ queryKey: interacaoKeys.byLead(leadUuid) }),
			]);
		},
		onError: (e: unknown) => {
			setErro(
				e instanceof Error ? e.message : "Erro ao salvar mensagem no banco de dados.",
			);
			setTimeout(() => setErro(""), 6000);
		},
	});

	const limpar = () => {
		setAnalise("");
		setMensagem("");
		setOportunidades([]);
		setModelo("");
		setErro("");
		setSucessoMsg("");
		setEstado("ocioso");
	};

	// Link direto wa.me
	const whatsappHref =
		whatsappDigits && mensagem.trim()
			? `https://wa.me/55${whatsappDigits}?text=${encodeURIComponent(mensagem)}`
			: null;

	return (
		<Card
			header={
				<div className="flex items-center justify-between w-full">
					<div>
						<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
							Enviar 1ª Mensagem com IA (WhatsApp)
						</h3>
						<p className="text-[11px] text-slate-400 font-normal mt-0.5">
							Geração sob medida para WhatsApp + Oportunidades de TI mapeadas
						</p>
					</div>
					<span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#062e21] border border-[#0d6e4b] text-[#34d399] flex items-center gap-1.5 shrink-0">
						<span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
						ESTADO: PRONTO ✓
					</span>
				</div>
			}
		>
			<div className="space-y-4">
				{/* Feedback de sucesso */}
				{sucessoMsg && (
					<div className="p-3 rounded-lg border border-emerald-800 bg-emerald-950/60 text-emerald-300 text-xs flex items-center gap-2">
						<Check className="w-4 h-4 flex-shrink-0" />
						<span>{sucessoMsg}</span>
					</div>
				)}

				{/* Alerta de erro */}
				{erro && (
					<div className="p-3 rounded-lg border border-rose-800 bg-rose-950/60 text-rose-300 text-xs">
						{erro}
					</div>
				)}

				{!podeGerar && (
					<p className="text-xs text-slate-500 italic">
						Adicione um telefone celular ou fixo para habilitar o envio via WhatsApp.
					</p>
				)}

				{/* ESTADO OCIOSO */}
				{estado === "ocioso" && (
					<Button
						type="button"
						variant="primary"
						size="sm"
						onClick={() => gerar.mutate({})}
						isLoading={gerar.isPending}
						disabled={!podeGerar}
						leftIcon={<Sparkles className="w-3.5 h-3.5" />}
						className="w-full"
					>
						Analisar lead e gerar mensagem
					</Button>
				)}

				{/* ESTADO GERANDO */}
				{estado === "gerando" && (
					<Button
						type="button"
						variant="primary"
						size="sm"
						isLoading
						disabled
						leftIcon={<Sparkles className="w-3.5 h-3.5" />}
						className="w-full"
					>
						{gerar.variables?.mensagemAtual
							? "Aprimorando mensagem com Gemini..."
							: "Mapeando oportunidades e gerando com Gemini..."}
					</Button>
				)}

				{/* ESTADO PRONTO OU ERRO */}
				{(estado === "pronto" || estado === "erro") && (
					<>
						{oportunidades.length > 0 && (
							<div>
								<h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
									OPORTUNIDADES DE TI IDENTIFICADAS PELA IA ({oportunidades.length} CAMINHOS):
								</h4>
								<ul className="space-y-2">
									{oportunidades.map((op) => {
										const badgeClasses =
											op.prioridade === "PRINCIPAL"
												? "bg-[#1c1a3b] border-[#4338ca] text-[#a5b4fc]"
												: op.prioridade === "EXPANSAO"
													? "bg-[#382313] border-[#92400e] text-[#fcd34d]"
													: "bg-[#1e293b] border-slate-700 text-slate-300";

										return (
											<li
												key={`${op.prioridade}-${op.titulo}`}
												className="rounded-lg border border-slate-800/80 bg-[#0e1424] p-3 space-y-1.5"
											>
												<div className="flex items-start justify-between gap-2">
													<span className="text-xs font-bold text-slate-100">
														{op.titulo}
													</span>
													<span
														className={`shrink-0 rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border ${badgeClasses}`}
													>
														{op.prioridade}
													</span>
												</div>
												<p className="text-[11px] text-slate-400 leading-snug">
													Dor: {op.dor} &nbsp;·&nbsp; Ganho: {op.ganho}
												</p>
											</li>
										);
									})}
								</ul>
							</div>
						)}

						{analise && (
							<div className="rounded-md border border-indigo-900/40 bg-indigo-950/20 px-3 py-2 text-[11px] text-indigo-300/90 leading-relaxed">
								<span className="font-semibold text-indigo-200">Diagnóstico IA:</span> {analise}
							</div>
						)}

						<div className="space-y-3">
							<div>
								<label
									htmlFor="mensagem-texto"
									className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
								>
									MENSAGEM SUGERIDA (EDITÁVEL ANTES DE ENVIAR):
								</label>
								<textarea
									id="mensagem-texto"
									rows={6}
									value={mensagem}
									onChange={(e) => setMensagem(e.target.value)}
									className="w-full text-xs font-normal border border-slate-800 bg-[#0b0f19] rounded-lg p-3 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
								/>
							</div>

							<div className="flex flex-wrap items-center gap-2 pt-1">
								<button
									type="button"
									onClick={() => {
										if (whatsappHref) {
											window.open(
												whatsappHref,
												"_blank",
												"noopener,noreferrer",
											);
										}
									}}
									className="px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-black font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
								>
									💬 Enviar via WhatsApp ↗
								</button>

								<button
									type="button"
									onClick={() => salvarMutation.mutate()}
									disabled={salvarMutation.isPending || !mensagem.trim()}
									className="px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
								>
									<Save className="w-3.5 h-3.5" />
									{salvarMutation.isPending ? "Salvando…" : "Salvar Mensagem"}
								</button>

								<button
									type="button"
									onClick={() =>
										gerar.mutate(
											mensagem.trim()
												? { mensagemAtual: mensagem }
												: {},
										)
									}
									disabled={gerar.isPending}
									className="px-4 py-2 rounded-lg bg-[#14192b] border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
								>
									<RefreshCw className="w-3.5 h-3.5" />
									Regenerar / Melhorar
								</button>

								<button
									type="button"
									onClick={limpar}
									disabled={gerar.isPending}
									className="px-4 py-2 rounded-lg bg-[#14192b] border border-slate-700 text-slate-400 text-xs hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
								>
									Limpar
								</button>
							</div>

							<p className="text-[11px] text-slate-500 font-mono">
								wa.me/55{whatsappDigits || "41991824410"} · {modelo || "gemini-3.5-flash-lite"}
							</p>
						</div>
					</>
				)}
			</div>
		</Card>
	);
}
