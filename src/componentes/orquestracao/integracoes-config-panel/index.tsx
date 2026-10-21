import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
	getIntegracaoConfigServerFn,
	testarIntegracaoServerFn,
	updateIntegracaoConfigServerFn,
} from "#/api/integracao";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";

const INTEGRACAO_KEY = ["config", "integracao"] as const;

type Provedor = "AISA" | "GOOGLE_MAPS" | "GEMINI" | "OPENROUTER" | "SMTP";

const ROTULO: Record<Provedor, string> = {
	AISA: "AIsa (Apollo)",
	GOOGLE_MAPS: "Google Maps",
	GEMINI: "Gemini",
	OPENROUTER: "OpenRouter",
	SMTP: "SMTP",
};

export default function IntegracoesConfigPanel() {
	const queryClient = useQueryClient();
	const q = useQuery({
		queryKey: INTEGRACAO_KEY,
		queryFn: () => getIntegracaoConfigServerFn(),
	});

	const [aisaApiKey, setAisaApiKey] = useState("");
	const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
	const [geminiApiKey, setGeminiApiKey] = useState("");
	const [geminiModelo, setGeminiModelo] = useState("gemini-3.5-flash-lite");
	const [geminiPermitirPago, setGeminiPermitirPago] = useState(false);
	const [openRouterApiKey, setOpenRouterApiKey] = useState("");
	const [openRouterModelo, setOpenRouterModelo] = useState("");
	const [smtpHost, setSmtpHost] = useState("");
	const [smtpPorta, setSmtpPorta] = useState(587);
	const [smtpUsuario, setSmtpUsuario] = useState("");
	const [smtpSenha, setSmtpSenha] = useState("");
	const [ok, setOk] = useState("");
	const [teste, setTeste] = useState<Record<string, string>>({});

	const cfg = q.data?.config;

	useEffect(() => {
		if (cfg) {
			setGeminiModelo(cfg.geminiModelo || "gemini-3.5-flash-lite");
			setGeminiPermitirPago(cfg.geminiPermitirPago);
			setOpenRouterModelo(cfg.openRouterModelo);
			setSmtpHost(cfg.smtpHost);
			setSmtpPorta(cfg.smtpPorta ?? 587);
			setSmtpUsuario(cfg.smtpUsuario);
		}
	}, [cfg]);

	const salvar = useMutation({
		mutationFn: () =>
			updateIntegracaoConfigServerFn({
				data: {
					// segredos vazios = não alterar (o servidor ignora)
					aisaApiKey: aisaApiKey.trim() || undefined,
					googleMapsApiKey: googleMapsApiKey.trim() || undefined,
					geminiApiKey: geminiApiKey.trim() || undefined,
					geminiModelo: geminiModelo.trim() || undefined,
					geminiPermitirPago,
					openRouterApiKey: openRouterApiKey.trim() || undefined,
					openRouterModelo: openRouterModelo.trim() || undefined,
					smtpHost: smtpHost.trim() || undefined,
					smtpPorta,
					smtpUsuario: smtpUsuario.trim() || undefined,
					smtpSenha: smtpSenha.trim() || undefined,
				},
			}),
		onSuccess: () => {
			setAisaApiKey("");
			setGoogleMapsApiKey("");
			setGeminiApiKey("");
			setOpenRouterApiKey("");
			setSmtpSenha("");
			setOk("Configuração de integrações salva.");
			setTimeout(() => setOk(""), 3000);
			queryClient.invalidateQueries({ queryKey: INTEGRACAO_KEY });
		},
	});

	const testar = useMutation({
		mutationFn: (provedor: Provedor) =>
			testarIntegracaoServerFn({ data: { provedor } }),
		onSuccess: (res, provedor) =>
			setTeste((t) => ({
				...t,
				[provedor]: res.ok ? `✓ ${res.mensagem}` : `✕ ${res.mensagem}`,
			})),
		onError: (e, provedor) =>
			setTeste((t) => ({
				...t,
				[provedor]: `✕ ${e instanceof Error ? e.message : "Erro ao testar."}`,
			})),
	});

	if (q.isPending) {
		return <p className="text-xs text-slate-400">Carregando…</p>;
	}

	return (
		<Card
			header={
				<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
					Chaves de API & Integrações
				</h3>
			}
		>
			<div className="space-y-4">
				{ok && (
					<div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
						{ok}
					</div>
				)}
				<div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-[11px] text-slate-400">
					As chaves ficam salvas no <strong>banco de dados</strong> e nunca são
					exibidas em claro. Deixe o campo vazio para <strong>manter</strong> a
					chave atual.
				</div>

				{/* AIsa */}
				<CampoComTeste
					provedor="AISA"
					definida={cfg?.aisaDefinida}
					mascarada={cfg?.aisaMascarada}
					value={aisaApiKey}
					onChange={setAisaApiKey}
					placeholder="sk-aisa-…"
					teste={teste.AISA}
					isTestando={testar.isPending}
					onTestar={() => testar.mutate("AISA")}
				/>

				{/* Google Maps */}
				<CampoComTeste
					provedor="GOOGLE_MAPS"
					definida={cfg?.googleMapsDefinida}
					mascarada={cfg?.googleMapsMascarada}
					value={googleMapsApiKey}
					onChange={setGoogleMapsApiKey}
					placeholder="AIza…"
					teste={teste.GOOGLE_MAPS}
					isTestando={testar.isPending}
					onTestar={() => testar.mutate("GOOGLE_MAPS")}
				/>

				{/* Gemini */}
				<div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-slate-200">
							Gemini{" "}
							{cfg?.geminiDefinida && (
								<span className="font-normal text-emerald-400">
									({cfg.geminiMascarada} — definida)
								</span>
							)}
						</span>
						<Button
							variant="ghost"
							size="sm"
							isLoading={testar.isPending}
							onClick={() => testar.mutate("GEMINI")}
						>
							Testar
						</Button>
					</div>
					<input
						type="password"
						value={geminiApiKey}
						onChange={(e) => setGeminiApiKey(e.target.value)}
						placeholder={
							cfg?.geminiDefinida ? "•••••• (vazio p/ manter)" : "Cole a chave"
						}
						className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
					/>
					<Campo
						label="Modelo padrão"
						value={geminiModelo}
						onChange={setGeminiModelo}
						placeholder="gemini-3.5-flash-lite"
					/>
					<label className="flex cursor-pointer items-start gap-2">
						<input
							type="checkbox"
							checked={geminiPermitirPago}
							onChange={(e) => setGeminiPermitirPago(e.target.checked)}
							className="mt-0.5 size-3.5 rounded border-slate-600 bg-slate-950 accent-indigo-500"
						/>
						<span className="text-[11px] leading-snug text-slate-400">
							Permitir fallback pago — se o modelo gratuito falhar, tenta
							modelos pagos da cadeia (3.8-flash / 2.5-flash) e a chamada é
							faturada. Desligado = custo sempre zero.
						</span>
					</label>
					{teste.GEMINI && <ResultadoTeste texto={teste.GEMINI} />}
				</div>

				{/* OpenRouter */}
				<div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-slate-200">
							OpenRouter{" "}
							{cfg?.openRouterDefinida && (
								<span className="font-normal text-emerald-400">
									({cfg.openRouterMascarada} — definida)
								</span>
							)}
						</span>
						<Button
							variant="ghost"
							size="sm"
							isLoading={testar.isPending}
							onClick={() => testar.mutate("OPENROUTER")}
						>
							Testar
						</Button>
					</div>
					<input
						type="password"
						value={openRouterApiKey}
						onChange={(e) => setOpenRouterApiKey(e.target.value)}
						placeholder={
							cfg?.openRouterDefinida
								? "•••••• (vazio p/ manter)"
								: "Cole a chave"
						}
						className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
					/>
					<Campo
						label="Modelo padrão"
						value={openRouterModelo}
						onChange={setOpenRouterModelo}
						placeholder="openrouter/auto"
					/>
					{teste.OPENROUTER && <ResultadoTeste texto={teste.OPENROUTER} />}
				</div>

				{/* SMTP */}
				<div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-slate-200">
							SMTP (e-mail transacional){" "}
							{cfg?.smtpSenhaDefinida && (
								<span className="font-normal text-emerald-400">
									(senha definida)
								</span>
							)}
						</span>
						<Button
							variant="ghost"
							size="sm"
							isLoading={testar.isPending}
							onClick={() => testar.mutate("SMTP")}
						>
							Validar
						</Button>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<Campo
							label="Host"
							value={smtpHost}
							onChange={setSmtpHost}
							placeholder="smtp.gmail.com"
						/>
						<Campo
							label="Porta"
							value={String(smtpPorta)}
							onChange={(v) =>
								setSmtpPorta(Number(v.replace(/\D/g, "")) || 587)
							}
							placeholder="587"
						/>
						<Campo
							label="Usuário"
							value={smtpUsuario}
							onChange={setSmtpUsuario}
							placeholder="voce@gmail.com"
						/>
						<label className="block">
							<span className="mb-1 block text-xs font-semibold text-slate-300">
								Senha
							</span>
							<input
								type="password"
								value={smtpSenha}
								onChange={(e) => setSmtpSenha(e.target.value)}
								placeholder={
									cfg?.smtpSenhaDefinida
										? "•••••• (vazio p/ manter)"
										: "Senha de app"
								}
								className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
							/>
						</label>
					</div>
					{teste.SMTP && <ResultadoTeste texto={teste.SMTP} />}
				</div>

				<div className="flex justify-end">
					<Button
						variant="primary"
						size="sm"
						isLoading={salvar.isPending}
						onClick={() => salvar.mutate()}
					>
						Salvar integrações
					</Button>
				</div>
			</div>
		</Card>
	);
}

function CampoComTeste(props: {
	provedor: Provedor;
	definida?: boolean;
	mascarada?: string | null;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	teste?: string;
	isTestando: boolean;
	onTestar: () => void;
}) {
	return (
		<div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold text-slate-200">
					{ROTULO[props.provedor]}{" "}
					{props.definida && (
						<span className="font-normal text-emerald-400">
							({props.mascarada} — definida)
						</span>
					)}
				</span>
				<Button
					variant="ghost"
					size="sm"
					isLoading={props.isTestando}
					onClick={props.onTestar}
				>
					Testar
				</Button>
			</div>
			<input
				type="password"
				value={props.value}
				onChange={(e) => props.onChange(e.target.value)}
				placeholder={
					props.definida ? "•••••• (vazio p/ manter)" : props.placeholder
				}
				className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
			/>
			{props.teste && <ResultadoTeste texto={props.teste} />}
		</div>
	);
}

function ResultadoTeste({ texto }: { texto: string }) {
	const falhou = texto.startsWith("✕");
	return (
		<p
			className={`text-[11px] ${falhou ? "text-rose-400" : "text-emerald-400"}`}
		>
			{texto}
		</p>
	);
}

function Campo(props: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
}) {
	return (
		<label className="block">
			<span className="mb-1 block text-xs font-semibold text-slate-300">
				{props.label}
			</span>
			<input
				type="text"
				value={props.value}
				onChange={(e) => props.onChange(e.target.value)}
				placeholder={props.placeholder}
				className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
			/>
		</label>
	);
}
