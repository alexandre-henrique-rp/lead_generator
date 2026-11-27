import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Button from "#/componentes/ux/button";
import { formatCurrencyBRL, formatDateBR } from "#/lib/format";
import { maskCpfCnpj } from "#/lib/masks";
import {
	aceitarPropostaServerFn,
	getPropostaPublicaServerFn,
} from "#/api/funil";
import PdfViewer from "#/componentes/ux/pdf-viewer";

export const Route = createFileRoute("/p/proposta/$token")({
	head: () => ({
		meta: [
			{ title: "Proposta Comercial · King Dev Tec" },
			{
				name: "description",
				content: "Proposta Comercial e Escopo Técnico King Dev Tec",
			},
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: PublicPropostaPage,
});

function PublicPropostaPage() {
	const { token } = Route.useParams();

	const propostaQuery = useQuery({
		queryKey: ["proposta-publica", token],
		queryFn: () => getPropostaPublicaServerFn({ data: { token } }),
	});

	const [nome, setNome] = useState("");
	const [doc, setDoc] = useState("");
	const [formError, setFormError] = useState("");

	const aceitarMutation = useMutation({
		mutationFn: () =>
			aceitarPropostaServerFn({ data: { token, nome: nome.trim(), doc } }),
		onSuccess: () => {
			setFormError("");
			propostaQuery.refetch();
		},
		onError: (e: unknown) =>
			setFormError(e instanceof Error ? e.message : "Erro ao aceitar."),
	});

	if (propostaQuery.isPending) {
		return (
			<Centralizado>
				<p className="text-sm text-slate-500">Carregando proposta…</p>
			</Centralizado>
		);
	}

	const proposta = propostaQuery.data?.proposta ?? null;
	const projetoNome = propostaQuery.data?.projetoNome ?? null;
	const empresa = propostaQuery.data?.empresa ?? null;
	const motivo = propostaQuery.data?.motivo ?? "NAO_ENCONTRADA";

	if (!proposta) {
		const rascunho = motivo === "RASCUNHO";
		return (
			<Centralizado>
				<div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
					!
				</div>
				<h2 className="text-xl font-bold text-slate-900">
					{rascunho ? "Proposta ainda não publicada" : "Link inválido ou desativado"}
				</h2>
				<p className="text-xs text-slate-500">
					{rascunho
						? "Esta proposta ainda está em preparação. Aguarde o link definitivo."
						: "Este link foi desativado ou substituído por um novo. Solicite o link atualizado."}
				</p>
			</Centralizado>
		);
	}

	const aceita = proposta.status === "ACEITA";

	function handleAccept(e: React.FormEvent) {
		e.preventDefault();
		if (!nome.trim()) {
			setFormError("Informe o nome completo do responsável.");
			return;
		}
		const digits = doc.replace(/\D/g, "");
		if (digits.length !== 11 && digits.length !== 14) {
			setFormError("Informe um CPF ou CNPJ válido.");
			return;
		}
		setFormError("");
		aceitarMutation.mutate();
	}

	return (
		<div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-10 px-4 sm:px-6">
			<div className="max-w-2xl mx-auto space-y-6">
				<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
							K
						</div>
						<div>
							<h1 className="text-base font-bold text-slate-900">King Dev Tec</h1>
							<p className="text-xs text-slate-500">
								Proposta Comercial & Escopo Técnico
							</p>
						</div>
					</div>
					<span className="text-xs font-mono px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-semibold">
						Ref. #{proposta.uuid.slice(0, 8)}
					</span>
				</div>

				<div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
					<div>
						<span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
							Projeto
						</span>
						<h2 className="text-2xl font-extrabold text-slate-900 mt-1">
							{projetoNome ?? "Projeto"}
						</h2>
						<p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
							{proposta.resumo}
						</p>
					</div>

					{proposta.slideUrl && (
						<div className="-mx-6 sm:-mx-8">
							<PdfViewer url={proposta.slideUrl} />
						</div>
					)}

					{/* Dados da Empresa Destinatária e Quadro Societário (QSA) */}
					{empresa && (
						<div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-4">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
								<div>
									<span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
										Cliente Destinatário
									</span>
									<h3 className="text-base font-bold text-slate-900">
										{empresa.razaoSocial || empresa.nome}
									</h3>
									{empresa.razaoSocial && empresa.razaoSocial !== empresa.nome && (
										<p className="text-xs text-slate-500 font-medium">
											Nome Fantasia: {empresa.nome}
										</p>
									)}
								</div>
								<div className="text-left sm:text-right font-mono text-xs">
									<span className="text-slate-700 block">
										CNPJ: <strong className="text-slate-900">{maskCpfCnpj(empresa.cnpj ?? "")}</strong>
									</span>
									{(empresa.cidade || empresa.uf) && (
										<span className="text-slate-500 text-[11px] block">
											{empresa.cidade}/{empresa.uf}
										</span>
									)}
								</div>
							</div>

							{/* Quadro de Sócios e Administradores (QSA) */}
							{empresa.socios && empresa.socios.length > 0 ? (
								<div>
									<div className="flex items-center justify-between mb-2.5">
										<span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
											<span>👥</span> Quadro Societário (QSA da Receita Federal)
										</span>
										<span className="text-[10px] font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
											{empresa.socios.length} {empresa.socios.length === 1 ? "sócio" : "sócios"}
										</span>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
										{empresa.socios.map((socio) => (
											<div
												key={socio.uuid}
												className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col justify-between"
											>
												<div className="flex items-start justify-between gap-2">
													<div>
														<span className="text-xs font-bold text-slate-900 block leading-tight">
															{socio.nomeSocio}
														</span>
														<span className="text-[11px] text-indigo-600 font-medium block mt-0.5">
															{socio.qualificacaoSocio || "Sócio / Administrador"}
														</span>
													</div>
													{socio.percentualCapital !== null && socio.percentualCapital !== undefined && (
														<span className="text-[10px] font-mono text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
															{socio.percentualCapital}%
														</span>
													)}
												</div>

												<div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
													<span>
														{socio.cnpjCpfDoSocio ? maskCpfCnpj(socio.cnpjCpfDoSocio) : "Documento RFB"}
													</span>
													{socio.faixaEtaria && (
														<span className="text-slate-400">
															{socio.faixaEtaria}
														</span>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							) : (
								<p className="text-xs text-slate-400 italic">
									Quadro societário não informado ou empresa individual.
								</p>
							)}
						</div>
					)}

					<div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
						<div>
							<span className="text-[11px] text-slate-500 uppercase block">
								Investimento Total
							</span>
							<span className="text-2xl font-extrabold text-slate-900">
								{formatCurrencyBRL(proposta.precoFinalCentavos)}
							</span>
						</div>
						<div className="text-right">
							<span className="text-[11px] text-slate-500 uppercase block">
								Estimativa
							</span>
							<span className="text-sm font-bold text-slate-700">
								{proposta.tempoTotalHoras}h de trabalho
							</span>
						</div>
					</div>

					{aceita ? (
						<div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
							<p className="text-sm font-bold">✓ Proposta Aceita Formalmente!</p>
							<p className="text-xs text-emerald-700">
								Registrado para <strong>{proposta.aceiteNome}</strong> (
								{maskCpfCnpj(proposta.aceiteDoc ?? "")}) em{" "}
								{formatDateBR(proposta.aceiteEm, true)}. O contrato será enviado
								ao seu canal de contato.
							</p>
						</div>
					) : (
						<form onSubmit={handleAccept} className="pt-2 space-y-4">
							<div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
								<span className="text-xs font-bold text-slate-800 block">
									Identificação para Aceite Formal
								</span>
								{empresa?.socios && empresa.socios.length > 0 && (
									<div className="pt-0.5">
										<span className="text-[11px] text-slate-500 block mb-1.5 font-medium">
											Preencher rapidamente como sócio da empresa:
										</span>
										<div className="flex flex-wrap gap-1.5">
											{empresa.socios.map((s) => (
												<button
													key={s.uuid}
													type="button"
													onClick={() => {
														setNome(s.nomeSocio);
														if (s.cnpjCpfDoSocio && !s.cnpjCpfDoSocio.includes("*")) {
															setDoc(s.cnpjCpfDoSocio.replace(/\D/g, ""));
														}
													}}
													className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
												>
													<span>👤</span>
													<span className="font-semibold">{s.nomeSocio}</span>
													{s.qualificacaoSocio && (
														<span className="text-slate-400 text-[10px]">({s.qualificacaoSocio})</span>
													)}
												</button>
											))}
										</div>
									</div>
								)}
								{formError && (
									<p className="text-xs text-rose-600 font-medium">
										✕ {formError}
									</p>
								)}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label
											htmlFor="p-nome"
											className="block text-[11px] text-slate-600 uppercase font-semibold mb-1"
										>
											Nome do Responsável
										</label>
										<input
											id="p-nome"
											type="text"
											required
											placeholder="Ex: João da Silva"
											value={nome}
											onChange={(e) => setNome(e.target.value)}
											className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none"
										/>
									</div>
									<div>
										<label
											htmlFor="p-doc"
											className="block text-[11px] text-slate-600 uppercase font-semibold mb-1"
										>
											CPF ou CNPJ
										</label>
										<input
											id="p-doc"
											type="text"
											required
											placeholder="000.000.000-00"
											value={maskCpfCnpj(doc)}
											onChange={(e) => setDoc(e.target.value.replace(/\D/g, ""))}
											className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none"
										/>
									</div>
								</div>
							</div>

							<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
								<p className="text-xs text-slate-500">
									Ao aceitar, um registro imutável (hash) de aceite será vinculado
									a esta proposta.
								</p>
								<Button
									type="submit"
									variant="primary"
									size="md"
									isLoading={aceitarMutation.isPending}
									className="w-full sm:w-auto"
								>
									Aceitar Proposta →
								</Button>
							</div>
						</form>
					)}
				</div>

				<p className="text-center text-xs text-slate-400 font-mono">
					King Dev Tec · Ribeirão Preto/SP · Contato: (16) 99602-9107
				</p>
			</div>
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
