import { useMutation } from "@tanstack/react-query";
import {
	Check,
	Copy,
	Lightbulb,
	MessageCircle,
	RefreshCw,
	Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import {
	type CanalMensagem,
	gerarMensagemServerFn,
	type MensagemGerada,
	type OportunidadeTi,
} from "#/lib/ai-message";
import { renderizarEmailPrimeiraMensagem } from "#/lib/email-template";
import { onlyDigits } from "#/lib/masks";

const BADGE_PRIORIDADE: Record<
	OportunidadeTi["prioridade"],
	{ label: string; classes: string }
> = {
	ENTRADA: {
		label: "Entrada",
		classes: "bg-zinc-800 text-zinc-300 border-zinc-700",
	},
	PRINCIPAL: {
		label: "Principal",
		classes: "bg-indigo-950 text-indigo-300 border-indigo-800",
	},
	EXPANSAO: {
		label: "Expansão",
		classes: "bg-amber-950 text-amber-300 border-amber-800",
	},
};

export interface EnviarMensagemSectionProps {
	leadUuid: string;
	leadNome: string;
	telefoneCelular: string | null | undefined;
	telefoneFixo: string | null | undefined;
	/** E-mail do lead (campo email/emailCnpj) — habilita o canal EMAIL. */
	email?: string | null | undefined;
}

type Estado = "ocioso" | "gerando" | "pronto" | "erro";
type CanalUi = CanalMensagem;

export default function EnviarMensagemSection({
	leadUuid,
	leadNome,
	telefoneCelular,
	telefoneFixo,
	email,
}: EnviarMensagemSectionProps) {
	const [estado, setEstado] = useState<Estado>("ocioso");
	const [canal, setCanal] = useState<CanalUi>("WHATSAPP");
	const [analise, setAnalise] = useState("");
	const [mensagem, setMensagem] = useState("");
	const [assunto, setAssunto] = useState("");
	const [oportunidades, setOportunidades] = useState<OportunidadeTi[]>([]);
	const [erro, setErro] = useState("");
	const [modelo, setModelo] = useState("");
	const [copiadoHtml, setCopiadoHtml] = useState(false);

	const gerar = useMutation({
		mutationFn: async (vars: { mensagemAtual?: string; canal: CanalUi }) => {
			return gerarMensagemServerFn({
				data: {
					leadUuid,
					mensagemAtual: vars.mensagemAtual,
					canal: vars.canal,
				},
			});
		},
		onMutate: () => {
			setEstado("gerando");
			setErro("");
		},
		onSuccess: (resp: MensagemGerada) => {
			setAnalise(resp.analise);
			setMensagem(resp.mensagem);
			setAssunto(resp.assunto ?? "");
			setOportunidades(resp.oportunidades ?? []);
			setModelo(resp.modelo);
			setEstado("pronto");
		},
		onError: (e: unknown) => {
			setErro(e instanceof Error ? e.message : "Erro ao gerar mensagem.");
			setEstado("erro");
		},
	});

	const limpar = () => {
		setAnalise("");
		setMensagem("");
		setAssunto("");
		setOportunidades([]);
		setModelo("");
		setErro("");
		setCopiadoHtml(false);
		setEstado("ocioso");
	};

	const trocarCanal = (novo: CanalUi) => {
		if (novo === canal) return;
		setCanal(novo);
		// mensagem gerada é específica do canal — volta pro estado inicial
		limpar();
	};

	const whatsappDigits =
		onlyDigits(telefoneCelular) || onlyDigits(telefoneFixo);
	const emailDestino = (email ?? "").trim();
	const ehEmail = canal === "EMAIL";
	const podeGerar = ehEmail ? Boolean(emailDestino) : Boolean(whatsappDigits);

	const whatsappHref =
		whatsappDigits && mensagem.trim()
			? `https://wa.me/55${whatsappDigits}?text=${encodeURIComponent(mensagem)}`
			: null;

	// Prévia do email: função pura → recalcula quando o Operador edita
	// assunto ou corpo antes de copiar o HTML.
	const htmlEmail = useMemo(
		() =>
			renderizarEmailPrimeiraMensagem({
				assunto,
				corpo: mensagem,
			}),
		[assunto, mensagem],
	);

	const copiarHtml = async () => {
		try {
			await navigator.clipboard.writeText(htmlEmail.html);
			setCopiadoHtml(true);
			setTimeout(() => setCopiadoHtml(false), 2000);
		} catch {
			setErro(
				"Não deu pra copiar o HTML — selecione no preview e copie manualmente.",
			);
			setEstado("erro");
		}
	};

	return (
		<Card
			header={
				<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
					Enviar 1ª Mensagem
				</h3>
			}
		>
			<div className="space-y-4">
				{/* CANAL: WhatsApp ou Email */}
				<div
					className="flex rounded-lg border border-slate-700 bg-slate-950 p-1 gap-1"
					role="tablist"
					aria-label="Canal da mensagem"
				>
					{(["WHATSAPP", "EMAIL"] as const).map((c) => {
						const ativo = canal === c;
						return (
							<button
								key={c}
								type="button"
								role="tab"
								aria-selected={ativo}
								onClick={() => trocarCanal(c)}
								className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
									ativo
										? "bg-indigo-600 text-white"
										: "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
								}`}
							>
								{c === "WHATSAPP" ? (
									<MessageCircle className="w-3.5 h-3.5" />
								) : (
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										strokeLinecap="round"
										strokeLinejoin="round"
										className="w-3.5 h-3.5"
										aria-hidden="true"
									>
										<rect x="2" y="4" width="20" height="16" rx="2" />
										<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
									</svg>
								)}
								{c === "WHATSAPP" ? "WhatsApp" : "Email"}
							</button>
						);
					})}
				</div>

				{!podeGerar && (
					<p className="text-xs text-slate-500 italic">
						{ehEmail
							? "Adicione um e-mail ao lead (campo E-mail) pra gerar a mensagem por email."
							: "Adicione um telefone (Celular ou Fixo) para poder enviar via WhatsApp."}
					</p>
				)}

				{/* OCIOSO: mostra o botão "Analisar" (texto inicial só instrui) */}
				{estado === "ocioso" && (
					<>
						{!podeGerar ? null : (
							<p className="text-xs text-slate-400">
								Clique abaixo pra Alex gerar uma análise do lead e uma primeira
								mensagem {ehEmail ? "de e-mail" : "WhatsApp"} sob medida.
							</p>
						)}
						<Button
							type="button"
							variant="primary"
							size="sm"
							onClick={() => gerar.mutate({ canal })}
							isLoading={gerar.isPending}
							disabled={!podeGerar}
							leftIcon={<Sparkles className="w-3.5 h-3.5" />}
							className="w-full"
						>
							Analisar lead e gerar mensagem
						</Button>
					</>
				)}

				{/* GERANDO: mostra botão com spinner, sem texto gerado ainda */}
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
							? "Melhorando com Gemini..."
							: "Gerando com Gemini..."}
					</Button>
				)}

				{/* ERRO: mostra o motivo, sem texto nenhum do Gemini */}
				{estado === "erro" && (
					<div className="space-y-3">
						<div
							role="alert"
							className="p-3 rounded-lg border border-rose-800/60 bg-rose-950/40 text-rose-200 text-xs space-y-1"
						>
							<p className="font-semibold">✕ Gemini não respondeu</p>
							<p className="text-rose-300/80 font-mono break-all">{erro}</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() =>
								gerar.mutate(
									mensagem.trim()
										? { mensagemAtual: mensagem, canal }
										: { canal },
								)
							}
							disabled={!podeGerar}
							leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
							className="w-full"
						>
							Tentar novamente
						</Button>
					</div>
				)}

				{/* PRONTO: mostra o texto que o Gemini retornou (ou edição) */}
				{estado === "pronto" && (
					<>
						<div>
							<label
								htmlFor="mensagem-analise"
								className="block text-xs font-semibold text-slate-300 uppercase mb-1"
							>
								Análise do lead
							</label>
							<textarea
								id="mensagem-analise"
								rows={5}
								value={analise}
								onChange={(e) => setAnalise(e.target.value)}
								className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
							/>
						</div>

						{oportunidades.length > 0 && (
							<div>
								<h4 className="text-xs font-semibold text-slate-300 uppercase mb-1.5">
									Oportunidades de TI identificadas
								</h4>
								<ul className="space-y-1.5">
									{oportunidades.map((op) => {
										const badge =
											BADGE_PRIORIDADE[op.prioridade] ??
											BADGE_PRIORIDADE.ENTRADA;
										return (
											<li
												key={`${op.prioridade}-${op.titulo}`}
												className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1"
											>
												<div className="flex items-start justify-between gap-2">
													<span className="text-xs font-semibold text-slate-200 leading-snug">
														{op.titulo}
													</span>
													<span
														className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.classes}`}
													>
														{badge.label}
													</span>
												</div>
												<p className="text-[11px] text-slate-400 leading-snug">
													<span className="text-slate-500">Dor:</span> {op.dor}
												</p>
												<p className="text-[11px] text-slate-400 leading-snug">
													<span className="text-slate-500">Ganho:</span>{" "}
													{op.ganho}
												</p>
											</li>
										);
									})}
								</ul>
								<p className="mt-1.5 text-[11px] text-slate-500 italic flex items-center gap-1">
									<Lightbulb className="w-3 h-3 shrink-0" />A mensagem usa 3
									dessas — os demais são caminhos pra puxar na conversa.
								</p>
							</div>
						)}

						{ehEmail ? (
							<>
								{/* CANAL EMAIL: assunto editável + prévia + copiar HTML */}
								<div>
									<div className="flex items-center justify-between mb-1">
										<label
											htmlFor="email-assunto"
											className="block text-xs font-semibold text-slate-300 uppercase"
										>
											Assunto
										</label>
										<span className="text-[10px] text-slate-500 font-mono">
											{assunto.length}/60
										</span>
									</div>
									<input
										id="email-assunto"
										type="text"
										maxLength={60}
										value={assunto}
										onChange={(e) => setAssunto(e.target.value)}
										className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
								</div>

								<div>
									<label
										htmlFor="mensagem-texto"
										className="block text-xs font-semibold text-slate-300 uppercase mb-1"
									>
										Corpo do e-mail
									</label>
									<textarea
										id="mensagem-texto"
										rows={8}
										value={mensagem}
										onChange={(e) => setMensagem(e.target.value)}
										className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
								</div>

								<div>
									<span className="block text-xs font-semibold text-slate-300 uppercase mb-1">
										Prévia do e-mail
									</span>
									<iframe
										title="Prévia do e-mail (template King Dev)"
										sandbox=""
										srcDoc={htmlEmail.html}
										className="w-full h-72 rounded-lg border border-slate-700 bg-white"
									/>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<Button
										type="button"
										variant="primary"
										size="sm"
										onClick={copiarHtml}
										disabled={!mensagem.trim() || !assunto.trim()}
										leftIcon={
											copiadoHtml ? (
												<Check className="w-3.5 h-3.5" />
											) : (
												<Copy className="w-3.5 h-3.5" />
											)
										}
									>
										{copiadoHtml ? "HTML copiado!" : "Copiar HTML"}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										title="Pega a mensagem atual e gera uma versão melhorada (não gera do zero)"
										onClick={() =>
											gerar.mutate(
												mensagem.trim()
													? { mensagemAtual: mensagem, canal }
													: { canal },
											)
										}
										disabled={gerar.isPending}
										leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
									>
										Regenerar
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={limpar}
										disabled={gerar.isPending}
									>
										Limpar
									</Button>
								</div>

								<p className="text-xs text-slate-500 font-mono break-all">
									{leadNome} → {emailDestino || "—"}{" "}
									<span className="text-slate-600">· {modelo}</span>
								</p>
							</>
						) : (
							<>
								{/* CANAL WHATSAPP: como antes */}
								<div>
									<label
										htmlFor="mensagem-texto"
										className="block text-xs font-semibold text-slate-300 uppercase mb-1"
									>
										Mensagem sugerida
									</label>
									<textarea
										id="mensagem-texto"
										rows={8}
										value={mensagem}
										onChange={(e) => setMensagem(e.target.value)}
										className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<Button
										type="button"
										variant="primary"
										size="sm"
										onClick={() => {
											if (whatsappHref) {
												window.open(
													whatsappHref,
													"_blank",
													"noopener,noreferrer",
												);
											}
										}}
										disabled={!whatsappHref || !mensagem.trim()}
										leftIcon={<MessageCircle className="w-3.5 h-3.5" />}
									>
										Enviar via WhatsApp
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										title="Pega a mensagem atual e gera uma versão melhorada (não gera do zero)"
										onClick={() =>
											gerar.mutate(
												mensagem.trim()
													? { mensagemAtual: mensagem, canal }
													: { canal },
											)
										}
										disabled={gerar.isPending}
										leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
									>
										Regenerar
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={limpar}
										disabled={gerar.isPending}
									>
										Limpar
									</Button>
								</div>

								<p className="text-xs text-slate-500 font-mono">
									{leadNome} → +55{" "}
									{whatsappDigits.replace(
										/^(\d{2})(\d{5})(\d{4})$/,
										"($1) $2-$3",
									) || "—"}{" "}
									<span className="text-slate-600">· {modelo}</span>
								</p>
							</>
						)}
					</>
				)}
			</div>
		</Card>
	);
}
