import {
	AlertTriangle,
	ArrowUpRight,
	Check,
	Coins,
	Globe,
	Hourglass,
	Search,
	TrendingUp,
	Users,
} from "lucide-react";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import {
	calcularTempoAtividade,
	estimarPorteEFaturamento,
	formatarMoedaBrl,
} from "#/lib/empresa-porte";
import { formatDateBR } from "#/lib/format";
import { maskCep, maskCpfCnpj } from "#/lib/masks";

interface SuperficieAvancadaSectionProps {
	lead: any;
	sociosQuery: any;
	historicoCnpjQuery: any;
	cnpjMutation: any;
	onBuscarCnpj: () => void;
}

export default function SuperficieAvancadaSection({
	lead,
	sociosQuery,
	historicoCnpjQuery,
	cnpjMutation,
	onBuscarCnpj,
}: SuperficieAvancadaSectionProps) {
	const porteInfo = lead
		? estimarPorteEFaturamento(
				lead.porte,
				lead.opcaoPeloSimples,
				lead.opcaoPeloMei,
			)
		: null;
	const tempoAtividade = lead
		? calcularTempoAtividade(lead.dataInicioAtividade)
		: null;
	const capitalSocialFormatado = lead
		? formatarMoedaBrl(
				(lead.capitalSocialCentavos
					? lead.capitalSocialCentavos / 100
					: lead.capitalSocial) ?? 0,
			)
		: "R$ 0,00";

	const temDadosCnpj = Boolean(
		lead?.dataUltimaConsultaCnpj ||
			lead?.cnaeFiscal ||
			lead?.naturezaJuridica ||
			lead?.porte ||
			lead?.descricaoSituacaoCadastral ||
			lead?.razaoSocial,
	);

	const listaSocios =
		sociosQuery.data?.socios && sociosQuery.data.socios.length > 0
			? sociosQuery.data.socios
			: (lead?.qsa ?? []);

	return (
		<section
			aria-labelledby="secao-rfb-title"
			className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 lg:p-6 space-y-6"
		>
			{/* Header da Seção estilo Penpot */}
			<div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
				<div>
					<div className="flex flex-wrap items-center gap-2.5">
						<h2
							id="secao-rfb-title"
							className="text-sm font-bold text-slate-100 uppercase tracking-wider"
						>
							Superfície Avançada — Dados da Receita Federal, QSA & Auditoria CNPJ
						</h2>
						{lead?.descricaoSituacaoCadastral && (
							<span
								className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
									lead.descricaoSituacaoCadastral === "ATIVA"
										? "bg-emerald-950/70 text-emerald-300 border border-emerald-700/60"
										: "bg-rose-950/70 text-rose-300 border border-rose-700/60"
								}`}
							>
								● {lead.descricaoSituacaoCadastral} ✓
							</span>
						)}
					</div>
					<p className="text-xs text-slate-400 mt-1">
						Consulta e inteligência de qualificação da RFB via BrasilAPI · Última
						consulta:{" "}
						{lead?.dataUltimaConsultaCnpj
							? formatDateBR(lead.dataUltimaConsultaCnpj, true)
							: "nunca"}
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2.5">
					{lead?.descricaoMatrizFilial && (
						<span className="px-2.5 py-1 rounded text-xs font-mono uppercase bg-slate-900 border border-slate-700 text-slate-300">
							{lead.descricaoMatrizFilial}
						</span>
					)}
					{lead?.porte && (
						<span className="px-2.5 py-1 rounded text-xs font-mono uppercase bg-indigo-950/60 border border-indigo-800 text-indigo-300">
							{lead.porte}
						</span>
					)}
					{lead?.cnpj && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							isLoading={cnpjMutation?.isPending}
							disabled={cnpjMutation?.isPending}
							onClick={onBuscarCnpj}
							leftIcon={<Search className="w-3.5 h-3.5" />}
							className="text-xs border-indigo-700/60 text-indigo-300 hover:bg-indigo-950/60"
						>
							Sincronizar Receita Federal
						</Button>
					)}
				</div>
			</div>

			{!lead?.cnpj && !temDadosCnpj ? (
				<p className="text-xs text-slate-500 italic text-center py-4">
					Sem CNPJ cadastrado. Adicione um CNPJ no formulário e sincronize com a
					Receita Federal.
				</p>
			) : !temDadosCnpj ? (
				<div className="text-center py-6 space-y-3">
					<p className="text-xs text-slate-400">
						CNPJ{" "}
						<span className="font-mono text-slate-200 font-semibold">
							{maskCpfCnpj(lead.cnpj ?? "")}
						</span>{" "}
						cadastrado, mas os dados da Receita Federal ainda não foram
						consultados.
					</p>
					<Button
						variant="primary"
						size="sm"
						onClick={onBuscarCnpj}
						disabled={cnpjMutation?.isPending}
						leftIcon={<Search className="w-3.5 h-3.5" />}
					>
						{cnpjMutation?.isPending
							? "Consultando…"
							: "Consultar Agora na BrasilAPI"}
					</Button>
				</div>
			) : (
				<div className="space-y-6">
					{/* Situação Especial se houver */}
					{lead.situacaoEspecial && (
						<div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
							<div className="flex items-center gap-2">
								<AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
								<span className="font-bold uppercase tracking-wider text-amber-400">
									Situação Especial:
								</span>
								<span>{lead.situacaoEspecial}</span>
							</div>
							{lead.dataSituacaoEspecial && (
								<span className="font-mono text-xs text-amber-300">
									Desde {formatDateBR(lead.dataSituacaoEspecial)}
								</span>
							)}
						</div>
					)}

					{/* 4 Cards de Destaque / KPIs Comerciais estilo Penpot */}
					{porteInfo && (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							<div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-1">
								<div className="flex items-center justify-between text-slate-400 text-xs">
									<span className="font-semibold uppercase tracking-wider">
										Tamanho & Equipe
									</span>
									<Users className="w-3.5 h-3.5 text-indigo-400" />
								</div>
								<p className="text-sm font-bold text-slate-100">
									{lead.quantidadeFuncionarios
										? `${lead.quantidadeFuncionarios}+ colaboradores`
										: porteInfo.estimativaFuncionarios}
								</p>
								<p className="text-xs text-indigo-400 font-medium truncate">
									{porteInfo.label}
								</p>
							</div>

							<div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-1">
								<div className="flex items-center justify-between text-slate-400 text-xs">
									<span className="font-semibold uppercase tracking-wider">
										Faturamento Presumido
									</span>
									<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
								</div>
								<p className="text-sm font-bold text-emerald-300 font-mono">
									{lead.faturamentoPresumido || porteInfo.faturamentoPresumido}
								</p>
								<p className="text-xs text-slate-400">
									Estimativa por enquadramento
								</p>
							</div>

							<div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-1">
								<div className="flex items-center justify-between text-slate-400 text-xs">
									<span className="font-semibold uppercase tracking-wider">
										Capital Social
									</span>
									<Coins className="w-3.5 h-3.5 text-amber-400" />
								</div>
								<p className="text-sm font-bold font-mono text-slate-100">
									{capitalSocialFormatado}
								</p>
								<p className="text-xs text-slate-400">
									Declarado na Receita Federal
								</p>
							</div>

							<div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-1">
								<div className="flex items-center justify-between text-slate-400 text-xs">
									<span className="font-semibold uppercase tracking-wider">
										Tempo de Atividade
									</span>
									<Hourglass className="w-3.5 h-3.5 text-blue-400" />
								</div>
								<p className="text-sm font-bold text-slate-100">
									{tempoAtividade ?? "—"}
								</p>
								<p className="text-xs text-slate-400">
									{lead.dataInicioAtividade
										? `Fundada em ${formatDateBR(lead.dataInicioAtividade)}`
										: "Data não informada"}
								</p>
							</div>
						</div>
					)}

					{/* Grid com Dados Cadastrais Fiscais & CNAEs (Esquerda) e QSA (Direita) */}
					<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
						{/* Detalhes Fiscais e CNAEs */}
						<Card
							header={
								<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
									Enquadramento Fiscal & CNAEs
								</h3>
							}
						>
							<div className="space-y-4 text-xs">
								{lead.cnaeFiscalDescricao && (
									<div className="p-3 rounded-lg border border-slate-800 bg-slate-950">
										<p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
											Atividade Principal (CNAE Primário)
										</p>
										<p className="text-slate-100 font-medium">
											<span className="font-mono text-indigo-400 font-bold mr-2">
												{lead.cnaeFiscal}
											</span>
											{lead.cnaeFiscalDescricao}
										</p>
									</div>
								)}

								<div className="grid grid-cols-2 gap-3">
									<div>
										<p className="text-xs text-slate-500 uppercase font-semibold">
											Simples Nacional
										</p>
										<p
											className={
												lead.opcaoPeloSimples
													? "text-emerald-400 font-semibold inline-flex items-center gap-1"
													: "text-slate-400"
											}
										>
											{lead.opcaoPeloSimples && <Check className="w-3 h-3" />}
											{lead.opcaoPeloSimples ? "Optante" : "Não optante"}
											{lead.dataOpcaoPeloSimples &&
												` (desde ${formatDateBR(lead.dataOpcaoPeloSimples)})`}
										</p>
									</div>
									<div>
										<p className="text-xs text-slate-500 uppercase font-semibold">
											MEI
										</p>
										<p
											className={
												lead.opcaoPeloMei
													? "text-emerald-400 font-semibold inline-flex items-center gap-1"
													: "text-slate-400"
											}
										>
											{lead.opcaoPeloMei && <Check className="w-3 h-3" />}
											{lead.opcaoPeloMei ? "Optante" : "Não enquadrado"}
										</p>
									</div>
								</div>

								{lead.naturezaJuridica && (
									<div>
										<p className="text-xs text-slate-500 uppercase font-semibold">
											Natureza Jurídica
										</p>
										<p className="text-slate-200">
											{lead.codigoNaturezaJuridica
												? `[${lead.codigoNaturezaJuridica}] `
												: ""}
											{lead.naturezaJuridica}
										</p>
									</div>
								)}

								{lead.cnaesSecundarios && lead.cnaesSecundarios.length > 0 && (
									<div className="p-3 rounded-lg border border-slate-800 bg-slate-950">
										<p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">
											CNAEs Secundários ({lead.cnaesSecundarios.length})
										</p>
										<div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
											{lead.cnaesSecundarios.map((c: any) => (
												<div
													key={c.codigo}
													className="text-slate-300 text-xs flex items-start gap-2.5 p-1.5 rounded hover:bg-slate-900/60"
												>
													<span className="font-mono text-indigo-400 font-semibold shrink-0">
														{c.codigo}
													</span>
													<span>{c.descricao}</span>
												</div>
											))}
										</div>
									</div>
								)}

								{lead.regimeTributario && lead.regimeTributario.length > 0 && (
									<div className="p-3 rounded-lg border border-slate-800 bg-slate-950 space-y-1.5">
										<p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
											Histórico de Regime Tributário (Escriturações)
										</p>
										<div className="flex flex-wrap gap-2 pt-1">
											{lead.regimeTributario.map((r: any) => (
												<span
													key={r.ano}
													className="px-2.5 py-1 rounded-md text-xs font-mono border border-slate-800 bg-slate-900 text-slate-300"
												>
													<strong className="text-indigo-400">{r.ano}:</strong>{" "}
													{r.forma_de_tributacao}{" "}
													<span className="text-slate-500 text-xs">
														({r.quantidade_de_escrituracoes} escr.)
													</span>
												</span>
											))}
										</div>
									</div>
								)}
							</div>
						</Card>

						{/* Quadro Societário (QSA) */}
						<Card
							header={
								<div className="flex items-center justify-between w-full">
									<div>
										<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
											Quadro Societário (QSA)
										</h3>
										<p className="text-xs text-slate-500 mt-0.5">
											Sócios e administradores retornados pela Receita Federal
										</p>
									</div>
									<span className="text-xs font-mono text-slate-400">
										{listaSocios.length} sócio(s)
									</span>
								</div>
							}
						>
							{sociosQuery?.isPending && listaSocios.length === 0 ? (
								<p className="text-xs text-slate-500 italic text-center py-3">
									Carregando QSA…
								</p>
							) : listaSocios.length === 0 ? (
								<p className="text-xs text-slate-500 italic text-center py-3">
									Nenhum sócio registrado. (Sincronize com a Receita Federal
									acima.)
								</p>
							) : (
								<div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
									{listaSocios.map((s: any, idx: number) => (
										<div
											key={s.uuid ?? `${s.nomeSocio}-${idx}`}
											className="p-3 rounded-lg border border-slate-800 bg-slate-950 space-y-1.5"
										>
											<div className="flex flex-wrap items-start justify-between gap-2">
												<div>
													<p className="font-bold text-xs text-slate-100">
														{s.nomeSocio}
													</p>
													<p className="text-[11px] font-mono text-slate-400 mt-0.5">
														{s.cnpjCpfDoSocio ?? "(sem documento)"}
														{s.qualificacaoSocio && (
															<span className="text-indigo-400 font-sans font-semibold">
																{" · "}
																{s.qualificacaoSocio}
															</span>
														)}
													</p>
												</div>
												{s.dataEntradaSociedade && (
													<span className="text-[10px] text-slate-500 font-mono whitespace-nowrap bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
														Entrada:{" "}
														{formatDateBR(
															new Date(s.dataEntradaSociedade).toISOString(),
														)}
													</span>
												)}
											</div>
											<div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
												{s.faixaEtaria && (
													<span>Faixa etária: {s.faixaEtaria}</span>
												)}
												{s.pais && <span>País: {s.pais}</span>}
											</div>
											{(s.nomeRepresentanteLegal ||
												s.cpfRepresentanteLegal) && (
												<div className="pt-1.5 border-t border-slate-900 text-[11px] text-slate-400">
													<span className="text-slate-500">
														Representante Legal:{" "}
													</span>
													<strong className="text-slate-200">
														{s.nomeRepresentanteLegal || "—"}
													</strong>
													{s.cpfRepresentanteLegal && (
														<span className="font-mono text-slate-500 ml-1">
															({s.cpfRepresentanteLegal})
														</span>
													)}
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</Card>
					</div>

					{/* Histórico de Consultas CNPJ (Log de Auditoria BrasilAPI) */}
					<Card
						header={
							<div className="flex items-center justify-between w-full">
								<div>
									<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
										Histórico de Consultas CNPJ
									</h3>
									<p className="text-xs text-slate-500 mt-0.5">
										Log de auditoria da BrasilAPI
									</p>
								</div>
								<span className="text-xs font-mono text-slate-400">
									{historicoCnpjQuery?.data?.consultas.length ?? 0} consulta(s)
								</span>
							</div>
						}
					>
						{historicoCnpjQuery?.isPending ? (
							<p className="text-xs text-slate-500 italic text-center py-3">
								Carregando histórico…
							</p>
						) : !historicoCnpjQuery?.data ||
							historicoCnpjQuery.data.consultas.length === 0 ? (
							<p className="text-xs text-slate-500 italic text-center py-3">
								Nenhuma consulta registrada ainda.
							</p>
						) : (
							<div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
								{historicoCnpjQuery.data.consultas.map((c: any) => {
									const statusClass =
										c.status === "SUCESSO"
											? "text-emerald-400"
											: c.status === "NAO_ENCONTRADO"
												? "text-amber-400"
												: c.status === "RATE_LIMIT"
													? "text-blue-400"
													: "text-rose-400";
									return (
										<div
											key={c.uuid}
											className="flex items-center justify-between p-2 rounded border border-slate-800 bg-slate-950 text-xs"
										>
											<div className="flex items-center gap-2">
												<span className="font-mono text-slate-400">
													{formatDateBR(
														new Date(c.dataConsulta).toISOString(),
														true,
													)}
												</span>
												<span className="font-mono text-slate-500">·</span>
												<span className="font-mono text-slate-300">
													{c.cnpjConsultado}
												</span>
												<span className="font-mono text-slate-500">·</span>
												<span className="text-slate-500">{c.fonte}</span>
											</div>
											<div className="flex items-center gap-2">
												<span className={`font-mono font-bold ${statusClass}`}>
													{c.status}
												</span>
												{c.mensagemErro && (
													<span
														title={c.mensagemErro}
														className="text-rose-400 cursor-help"
													>
														<AlertTriangle className="w-3 h-3" />
													</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</Card>
				</div>
			)}
		</section>
	);
}
