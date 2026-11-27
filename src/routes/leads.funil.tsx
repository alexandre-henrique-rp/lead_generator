import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import { requireUserOrRedirect } from "#/lib/auth-helper";
import {
	agruparLeadsNoKanban,
	COLUNAS_KANBAN,
	type ColunaKanbanKey,
	formatarCentavosParaReais,
	type KanbanLeadCard,
	mapearColunaParaEtapaPadrao,
} from "#/lib/kanban-funil";
import {
	criarLeadServerFn,
	listarKanbanLeadsServerFn,
	moverEtapaLeadServerFn,
} from "#/lib/leads";
import { maskCpfCnpj, maskPhone } from "#/lib/masks";

export const Route = createFileRoute("/leads/funil")({
	beforeLoad: ({ location }) =>
		requireUserOrRedirect("/login", location.pathname),
	loader: async ({ context: { queryClient } }) => {
		return queryClient.ensureQueryData({
			queryKey: ["leads", "kanban"],
			queryFn: () => listarKanbanLeadsServerFn(),
		});
	},
	component: LeadsFunilPage,
});

const ITENS_POR_PAGINA_COLUNA = 15;

function formatarTempoRelativo(dataStr: string): string {
	if (!dataStr) return "hoje";
	const diffMs = Date.now() - new Date(dataStr).getTime();
	const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
	if (diffHoras < 1) return "agora";
	if (diffHoras < 24) return `há ${diffHoras}h`;
	const diffDias = Math.floor(diffHoras / 24);
	if (diffDias === 1) return "há 1d";
	if (diffDias < 30) return `há ${diffDias}d`;
	const diffMeses = Math.floor(diffDias / 30);
	return `há ${diffMeses}m`;
}

function obterBadgeContextual(lead: KanbanLeadCard) {
	const etapa = (lead.etapa || "").toUpperCase();
	if (etapa === "NOVO") {
		return lead.temWhatsapp
			? { texto: "1ª Msg IA Pronta", cor: "bg-sky-950/60 text-sky-400 border border-sky-800/60" }
			: { texto: "Aguardando Contato", cor: "bg-slate-900 text-slate-400 border border-slate-800" };
	}
	if (etapa === "CONTATADO") {
		return lead.temWhatsapp
			? { texto: "Respondeu WA", cor: "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60" }
			: { texto: "Email Enviado", cor: "bg-slate-800 text-slate-300 border border-slate-700" };
	}
	if (etapa === "QUALIFICADO" || etapa === "DIAGNOSTICO") {
		return lead.horasEstimadas > 0
			? { texto: `Orçamento ${lead.horasEstimadas}h`, cor: "bg-indigo-950/60 text-indigo-300 border border-indigo-800/60" }
			: { texto: "Diagnóstico OK", cor: "bg-violet-950/60 text-violet-300 border border-violet-800/60" };
	}
	if (etapa === "PROPOSTA" || etapa === "PROPOSTA_ENVIADA") {
		if (lead.valorEstimadoCentavos > 0) {
			const valorK = (lead.valorEstimadoCentavos / 100000).toFixed(1);
			return { texto: `Proposta R$ ${valorK}k`, cor: "bg-amber-950/60 text-amber-400 border border-amber-800/60" };
		}
		return { texto: "Aguardando Aceite", cor: "bg-amber-950/60 text-amber-300 border border-amber-800/60" };
	}
	if (etapa === "NEGOCIACAO" || etapa === "NEGOCIANDO") {
		return { texto: "Desc. 8% (G-03 OK)", cor: "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60" };
	}
	if (etapa === "GANHO" || etapa === "FECHADO_GANHO") {
		return { texto: "✓ Contrato PKI", cor: "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60" };
	}
	if (etapa === "PERDIDO" || etapa === "FECHADO_PERDIDO") {
		return { texto: "✕ Preço / Adiado", cor: "bg-rose-950/60 text-rose-400 border border-rose-800/60" };
	}
	return { texto: lead.etapa, cor: "bg-slate-800 text-slate-400 border border-slate-700" };
}

function LeadsFunilPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// Filtros da barra superior
	const [busca, setBusca] = useState("");
	const [origemFiltro, setOrigemFiltro] = useState<string>("TODAS");
	const [apenasWhatsapp, setApenasWhatsapp] = useState(false);

	// Drag & Drop
	const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
	const [colunaHover, setColunaHover] = useState<ColunaKanbanKey | null>(null);

	// Modais & Menus Popover
	const [modalNovoAberto, setModalNovoAberto] = useState(false);
	const [etapaCriacaoRapida, setEtapaCriacaoRapida] = useState<string>("NOVO");
	const [menuAbertoLeadId, setMenuAbertoLeadId] = useState<string | null>(null);

	// Carregamento dinâmico: limite de 15 registros iniciais por coluna
	const [limitePorColuna, setLimitePorColuna] = useState<Record<ColunaKanbanKey, number>>({
		NOVO: ITENS_POR_PAGINA_COLUNA,
		CONTATADO: ITENS_POR_PAGINA_COLUNA,
		QUALIFICADO: ITENS_POR_PAGINA_COLUNA,
		PROPOSTA: ITENS_POR_PAGINA_COLUNA,
		NEGOCIACAO: ITENS_POR_PAGINA_COLUNA,
		FECHADO: ITENS_POR_PAGINA_COLUNA,
	});

	const { data: leads = [] } = useQuery({
		queryKey: ["leads", "kanban"],
		queryFn: () => listarKanbanLeadsServerFn(),
	});

	const moverMutation = useMutation({
		mutationFn: async ({ id, etapa }: { id: string; etapa: string }) => {
			return moverEtapaLeadServerFn({ data: { id, etapa } });
		},
		onMutate: async ({ id, etapa }) => {
			await queryClient.cancelQueries({ queryKey: ["leads", "kanban"] });
			const anterior = queryClient.getQueryData<KanbanLeadCard[]>([
				"leads",
				"kanban",
			]);
			if (anterior) {
				queryClient.setQueryData<KanbanLeadCard[]>(
					["leads", "kanban"],
					anterior.map((lead) =>
						lead.id === id ? { ...lead, etapa } : lead,
					),
				);
			}
			return { anterior };
		},
		onError: (_err, _vars, context) => {
			if (context?.anterior) {
				queryClient.setQueryData(["leads", "kanban"], context.anterior);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["leads", "kanban"] });
			queryClient.invalidateQueries({ queryKey: ["leads"] });
		},
	});

	// Filtragem
	const leadsFiltrados = useMemo(() => {
		const q = busca.trim().toLowerCase();
		return leads.filter((lead) => {
			if (origemFiltro !== "TODAS" && lead.origem !== origemFiltro) {
				return false;
			}
			if (apenasWhatsapp && !lead.temWhatsapp) {
				return false;
			}
			if (!q) return true;
			const nome = (lead.nome || "").toLowerCase();
			const razao = (lead.razaoSocial || "").toLowerCase();
			const cnpj = (lead.cnpj || "").replace(/\D/g, "");
			const tel = (lead.telefone || "").replace(/\D/g, "");
			const cidade = (lead.cidade || "").toLowerCase();
			return (
				nome.includes(q) ||
				razao.includes(q) ||
				cnpj.includes(q.replace(/\D/g, "")) ||
				tel.includes(q.replace(/\D/g, "")) ||
				cidade.includes(q)
			);
		});
	}, [leads, busca, origemFiltro, apenasWhatsapp]);

	// Agrupamento nas 6 colunas
	const colunasAgrupadas = useMemo(() => {
		return agruparLeadsNoKanban(leadsFiltrados);
	}, [leadsFiltrados]);

	// Métricas do Topo
	const metricas = useMemo(() => {
		const totalOportunidades = leads.length;
		const totalCentavos = leads.reduce(
			(acc, l) => acc + (l.valorEstimadoCentavos || 0),
			0,
		);
		return { totalOportunidades, totalCentavos };
	}, [leads]);

	// Detecção de scroll dinâmico por coluna (+15 itens)
	const handleScrollColuna = (
		e: React.UIEvent<HTMLDivElement>,
		colKey: ColunaKanbanKey,
		totalNaColuna: number,
	) => {
		const el = e.currentTarget;
		if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
			setLimitePorColuna((prev) => {
				const atual = prev[colKey] || ITENS_POR_PAGINA_COLUNA;
				if (atual >= totalNaColuna) return prev;
				return { ...prev, [colKey]: atual + ITENS_POR_PAGINA_COLUNA };
			});
		}
	};

	// Eventos Drag & Drop
	const handleDragStart = (e: React.DragEvent, leadId: string) => {
		e.dataTransfer.setData("text/plain", leadId);
		e.dataTransfer.effectAllowed = "move";
		setDraggedLeadId(leadId);
	};

	const handleDragEnd = () => {
		setDraggedLeadId(null);
		setColunaHover(null);
	};

	const handleDragOver = (e: React.DragEvent, colKey: ColunaKanbanKey) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		if (colunaHover !== colKey) {
			setColunaHover(colKey);
		}
	};

	const handleDragLeave = (e: React.DragEvent, colKey: ColunaKanbanKey) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			if (colunaHover === colKey) {
				setColunaHover(null);
			}
		}
	};

	const handleDrop = (e: React.DragEvent, colKey: ColunaKanbanKey) => {
		e.preventDefault();
		const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId;
		setColunaHover(null);
		setDraggedLeadId(null);

		if (!leadId) return;
		const novaEtapa = mapearColunaParaEtapaPadrao(colKey);
		moverMutation.mutate({ id: leadId, etapa: novaEtapa });
	};

	const handleMoverDireto = (leadId: string, etapaDestino: string) => {
		setMenuAbertoLeadId(null);
		moverMutation.mutate({ id: leadId, etapa: etapaDestino });
	};

	const abrirCriacaoRapida = (colKey: ColunaKanbanKey) => {
		const etapaPadrao = mapearColunaParaEtapaPadrao(colKey);
		setEtapaCriacaoRapida(etapaPadrao);
		setModalNovoAberto(true);
	};

	return (
		<AppShell noTopbar noPadding fullWidth>
			<div className="flex flex-col gap-4 min-h-screen bg-slate-950 text-slate-100">
				{/* 1. Breadcrumb e Topo idêntico ao Penpot */}
				<header className="px-6 pt-5 pb-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-900">
					<div>
						<div className="text-[11px] font-mono text-slate-400 tracking-wide uppercase">
							2. Qualificação &amp; Pipeline / Kanban do Funil de Vendas (/leads/funil)
						</div>
						<div className="flex items-center gap-3 mt-1">
							<h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
								Kanban do Funil de Vendas (Arrasta e Solta)
							</h1>
						</div>
						<p className="text-xs text-slate-400 mt-0.5">
							Pipeline comercial interativo com soma de ticket por coluna, Drag-and-Drop entre etapas e gatilhos de proposta/perda
						</p>
					</div>

					{/* Badge Verde Fluorescente no canto direito */}
					<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold font-mono tracking-wide shadow-sm self-start lg:self-center">
						<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
						<span>
							PIPELINE ATIVO: {formatarCentavosParaReais(metricas.totalCentavos)} EM {metricas.totalOportunidades} OPORTUNIDADES
						</span>
					</div>
				</header>

				{/* 2. Barra de Filtros e Ações exatamente como no Penpot */}
				<section className="mx-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-xl">
					<div className="flex flex-wrap items-center gap-2.5 flex-1">
						{/* Campo de Busca */}
						<div className="relative min-w-[240px] flex-1 sm:flex-initial">
							<span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs">
								🔍
							</span>
							<input
								type="text"
								placeholder="Filtrar cards por empresa ou CNPJ..."
								value={busca}
								onChange={(e) => setBusca(e.target.value)}
								className="w-full sm:w-72 rounded-lg bg-slate-950 border border-slate-700/80 pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
							/>
							{busca && (
								<button
									type="button"
									onClick={() => setBusca("")}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
								>
									✕
								</button>
							)}
						</div>

						{/* Dropdown de Origem */}
						<select
							value={origemFiltro}
							onChange={(e) => setOrigemFiltro(e.target.value)}
							className="rounded-lg bg-slate-950 border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none cursor-pointer"
						>
							<option value="TODAS">Origem: Todas ▾</option>
							<option value="MAPS">Google Maps / AIsa</option>
							<option value="CSV">Importação CSV</option>
							<option value="SITE">Site / Landing</option>
							<option value="MANUAL">Manual</option>
						</select>

						{/* Toggle Pill: Apenas com WhatsApp */}
						<button
							type="button"
							onClick={() => setApenasWhatsapp(!apenasWhatsapp)}
							className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
								apenasWhatsapp
									? "bg-emerald-950/80 text-emerald-400 border-emerald-500 shadow-xs"
									: "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
							}`}
						>
							<span>{apenasWhatsapp ? "☑" : "☐"}</span>
							<span>Apenas com WhatsApp</span>
						</button>

						{/* Dica de arrastar e soltar */}
						<div className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-950/40 text-indigo-300 border border-indigo-800/60 font-mono">
							<span>⇄</span>
							<span>Arraste um card para avançar ou converter etapa</span>
						</div>
					</div>

					{/* Botões à direita: Alternador Lista/Kanban e Novo Lead */}
					<div className="flex items-center gap-2.5 self-end lg:self-auto">
						{/* Alternador Lista / Kanban */}
						<div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
							<Link
								to="/leads"
								className="px-3 py-1 rounded-md font-medium text-slate-400 hover:text-slate-200 transition-colors"
							>
								≡ Lista
							</Link>
							<span className="px-3 py-1 rounded-md font-semibold bg-indigo-600 text-white shadow-xs">
								⊞ Kanban
							</span>
						</div>

						{/* Botão Novo Lead */}
						<Button
							variant="primary"
							size="sm"
							onClick={() => {
								setEtapaCriacaoRapida("NOVO");
								setModalNovoAberto(true);
							}}
							className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
						>
							+ Novo Lead Manual
						</Button>
					</div>
				</section>

				{/* 3. Grid das 6 Colunas do Kanban com Rolagem Independente & Carregamento Dinâmico */}
				<div className="px-6 flex gap-4 overflow-x-auto pb-4 items-start select-none flex-1">
					{COLUNAS_KANBAN.map((colConfig) => {
						const colData = colunasAgrupadas[colConfig.key];
						const isHover = colunaHover === colConfig.key;
						const limiteAtual = limitePorColuna[colConfig.key] || ITENS_POR_PAGINA_COLUNA;
						const leadsVisiveis = colData.leads.slice(0, limiteAtual);
						const possuiMaisLeads = colData.leads.length > limiteAtual;

						return (
							<div
								key={colConfig.key}
								onDragOver={(e) => handleDragOver(e, colConfig.key)}
								onDragLeave={(e) => handleDragLeave(e, colConfig.key)}
								onDrop={(e) => handleDrop(e, colConfig.key)}
								className={`flex-shrink-0 w-80 rounded-2xl bg-slate-900/80 border transition-all duration-200 flex flex-col max-h-[calc(100vh-175px)] ${
									isHover
										? "border-indigo-500 ring-2 ring-indigo-500/30 bg-slate-900 shadow-xl"
										: "border-slate-800/90"
								}`}
							>
								{/* Cabeçalho da Coluna com Badge e Sub-valor */}
								<div className="p-3.5 border-b border-slate-800/80">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div
												className={`w-2 h-2 rounded-full ${
													colConfig.key === "NOVO"
														? "bg-sky-400"
														: colConfig.key === "CONTATADO"
															? "bg-indigo-400"
															: colConfig.key === "QUALIFICADO"
																? "bg-violet-400"
																: colConfig.key === "PROPOSTA"
																	? "bg-amber-400"
																	: colConfig.key === "NEGOCIACAO"
																		? "bg-violet-400"
																		: "bg-emerald-400"
												}`}
											/>
											<span className="text-xs font-black uppercase tracking-wider text-slate-100">
												{colConfig.titulo}
											</span>
										</div>

										{/* Badge com contagem */}
										<span
											className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold font-mono border ${colConfig.corBadge}`}
										>
											{colConfig.key === "FECHADO"
												? `${colData.ganhosCount || 0} ganhos · ${colData.perdidosCount || 0} perd.`
												: `${colData.quantidade} leads`}
										</span>
									</div>

									{/* Sub-valor em destaque com cor da coluna */}
									<div className="mt-1.5 flex items-baseline gap-1">
										<span className={`text-sm font-black font-mono ${colConfig.corTexto}`}>
											{formatarCentavosParaReais(colData.totalValorCentavos)}
										</span>
										{colConfig.sufixoValor && (
											<span className="text-[11px] font-medium text-slate-400">
												{colConfig.sufixoValor}
											</span>
										)}
									</div>
								</div>

								{/* Lista de Cards com Scroll Independente e Carregamento Dinâmico (15 em 15) */}
								<div
									onScroll={(e) =>
										handleScrollColuna(e, colConfig.key, colData.leads.length)
									}
									className="p-2.5 flex-1 overflow-y-auto space-y-2.5 min-h-[160px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
								>
									{/* Slot pontilhado indicando dropzone quando sobrevoando */}
									{isHover && draggedLeadId && (
										<div className="rounded-xl border-2 border-dashed border-indigo-500/80 bg-indigo-500/10 p-3.5 text-center text-xs font-semibold text-indigo-300 animate-pulse">
											⤓ Mover para {colConfig.titulo}
										</div>
									)}

									{leadsVisiveis.map((lead) => {
										const isBeingDragged = draggedLeadId === lead.id;
										const menuAberto = menuAbertoLeadId === lead.id;
										const badgeContext = obterBadgeContextual(lead);

										return (
											<div
												key={lead.id}
												draggable
												onDragStart={(e) => handleDragStart(e, lead.id)}
												onDragEnd={handleDragEnd}
												className={`group relative rounded-xl border bg-slate-950 p-3.5 shadow-sm transition-all cursor-grab active:cursor-grabbing hover:border-slate-700 hover:shadow-md ${
													isBeingDragged
														? "opacity-30 border-dashed border-indigo-500 scale-[0.98]"
														: "border-slate-800/90"
												}`}
											>
												{/* Tag de Arrastando no topo do card */}
												{isBeingDragged && (
													<div className="absolute -top-3 left-3 px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold shadow-md">
														⇄ ARRASTANDO
													</div>
												)}

												{/* Linha 1: Ícone de grab + Nome do Lead + Botão ... */}
												<div className="flex items-start justify-between gap-2">
													<div className="flex items-center gap-1.5 flex-1 min-w-0">
														<span className="text-slate-600 group-hover:text-slate-400 cursor-grab text-xs">
															⠿
														</span>
														<Link
															to="/leads/$id"
															params={{ id: lead.id }}
															className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors truncate block"
															title={lead.nome}
														>
															{lead.nome}
														</Link>
													</div>

													{/* Menu de Ações Rápidas (...) */}
													<div className="relative">
														<button
															type="button"
															onClick={() =>
																setMenuAbertoLeadId(
																	menuAberto ? null : lead.id,
																)
															}
															className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-850 text-xs transition-colors"
															title="Opções do lead"
														>
															⋯
														</button>

														{/* Popover idêntico ao Penpot */}
														{menuAberto && (
															<div className="absolute right-0 top-full mt-1 w-56 rounded-xl bg-slate-900 border border-slate-700/90 p-2 shadow-2xl z-40 text-xs">
																<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1 truncate">
																	MENU RÁPIDO · {lead.nome}
																</div>

																<button
																	type="button"
																	onClick={() => {
																		setMenuAbertoLeadId(null);
																		navigate({
																			to: "/leads/$id",
																			params: { id: lead.id },
																		});
																	}}
																	className="w-full text-left px-2 py-1.5 rounded text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between text-[11px]"
																>
																	<span>Abrir Ficha 360º do Lead</span>
																	<span className="text-[10px] text-slate-500 font-mono">
																		Enter
																	</span>
																</button>

																{lead.telefone && (
																	<a
																		href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
																		target="_blank"
																		rel="noreferrer"
																		onClick={() => setMenuAbertoLeadId(null)}
																		className="w-full text-left px-2 py-1.5 rounded text-emerald-400 hover:bg-emerald-950/50 flex items-center justify-between text-[11px]"
																	>
																		<span>Enviar 1ª Mensagem com IA</span>
																		<span className="text-[10px] text-emerald-600 font-mono">
																			⌘M
																		</span>
																	</a>
																)}

																<button
																	type="button"
																	onClick={() => {
																		setMenuAbertoLeadId(null);
																		navigate({
																			to: "/leads/$id",
																			params: { id: lead.id },
																		});
																	}}
																	className="w-full text-left px-2 py-1.5 rounded text-slate-200 hover:bg-slate-800 flex items-center justify-between text-[11px]"
																>
																	<span>Gerar Orçamento / Proposta</span>
																	<span className="text-[10px] text-slate-500 font-mono">
																		⌘P
																	</span>
																</button>

																<div className="my-1 border-t border-slate-800" />

																<div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase">
																	Mover etapa:
																</div>
																{COLUNAS_KANBAN.map((destCol) => (
																	<button
																		key={destCol.key}
																		type="button"
																		onClick={() =>
																			handleMoverDireto(
																				lead.id,
																				mapearColunaParaEtapaPadrao(
																					destCol.key,
																				),
																			)
																		}
																		disabled={destCol.key === colConfig.key}
																		className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
																			destCol.key === colConfig.key
																				? "text-slate-600 cursor-not-allowed"
																				: "text-slate-300 hover:bg-slate-800 hover:text-indigo-400"
																		}`}
																	>
																		<span>{destCol.titulo}</span>
																		{destCol.key === colConfig.key && (
																			<span>✓</span>
																		)}
																	</button>
																))}

																<div className="my-1 border-t border-slate-800" />

																<button
																	type="button"
																	onClick={() =>
																		handleMoverDireto(lead.id, "PERDIDO")
																	}
																	className="w-full text-left px-2 py-1.5 rounded text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-center justify-between text-[11px]"
																>
																	<span>Marcar como Perdido...</span>
																	<span className="text-[10px] text-rose-500 font-mono">
																		Del
																	</span>
																</button>
															</div>
														)}
													</div>
												</div>

												{/* Linha 2: CNPJ · Cidade/UF */}
												<div className="text-[11px] font-mono text-slate-400 mt-1 truncate">
													{lead.cnpj ? maskCpfCnpj(lead.cnpj) : "Sem CNPJ"}
													{lead.cidade && ` · ${lead.cidade}`}
												</div>

												{/* Linha 3: Badges de Origem, WhatsApp e Status Contextual */}
												<div className="flex flex-wrap items-center gap-1.5 mt-2.5">
													<span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-800">
														{lead.origem}
													</span>

													{lead.temWhatsapp && (
														<span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800/60">
															<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
															WhatsApp
														</span>
													)}

													<span
														className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgeContext.cor}`}
													>
														{badgeContext.texto}
													</span>
												</div>

												{/* Rodapé do Card: Valor à esquerda e Data relativa à direita */}
												<div className="mt-3 pt-2 border-t border-slate-900/90 flex items-center justify-between text-xs">
													<span
														className={`font-black font-mono ${
															lead.valorEstimadoCentavos > 0
																? "text-emerald-400"
																: "text-slate-400"
														}`}
													>
														{formatarCentavosParaReais(lead.valorEstimadoCentavos)}{" "}
														<span className="text-[10px] font-normal text-slate-500">
															est.
														</span>
													</span>

													<span className="text-[11px] font-mono text-slate-500">
														{formatarTempoRelativo(lead.createdAt)}
													</span>
												</div>
											</div>
										);
									})}

									{/* Fallback de Coluna Vazia */}
									{colData.leads.length === 0 && (
										<div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-slate-800/80 text-center text-slate-500 my-2">
											<p className="text-xs font-semibold">Nenhum lead nesta etapa</p>
											<p className="text-[11px] text-slate-600 mt-0.5">
												Arraste um card para cá
											</p>
										</div>
									)}

									{/* Indicador de Carregamento Dinâmico (+15 leads ao rolar) */}
									{possuiMaisLeads && (
										<div className="pt-1 pb-2 text-center text-[11px] font-mono text-slate-500">
											Mostrando {leadsVisiveis.length} de {colData.leads.length} leads
											<span className="block text-[10px] text-indigo-400/80 animate-pulse mt-0.5">
												Role para carregar mais +
											</span>
										</div>
									)}
								</div>

								{/* Rodapé da Coluna: Botão criar rápido idêntico ao Penpot */}
								<div className="p-2.5 pt-0">
									<button
										type="button"
										onClick={() => abrirCriacaoRapida(colConfig.key)}
										className="w-full py-2 rounded-xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
									>
										<span>+</span>
										<span>Soltar lead aqui ou criar rápido</span>
									</button>
								</div>
							</div>
						);
					})}
				</div>

				{/* Modal de Criação Rápida de Lead */}
				{modalNovoAberto && (
					<ModalNovoLead
						etapaInicial={etapaCriacaoRapida}
						onClose={() => setModalNovoAberto(false)}
						onSuccess={() => {
							setModalNovoAberto(false);
							queryClient.invalidateQueries({ queryKey: ["leads", "kanban"] });
						}}
					/>
				)}
			</div>
		</AppShell>
	);
}

function ModalNovoLead({
	etapaInicial = "NOVO",
	onClose,
	onSuccess,
}: {
	etapaInicial?: string;
	onClose: () => void;
	onSuccess: () => void;
}) {
	const [nome, setNome] = useState("");
	const [telefone, setTelefone] = useState("");
	const [cnpj, setCnpj] = useState("");
	const [cidade, setCidade] = useState("");
	const [erro, setErro] = useState<string | null>(null);

	const criarMutation = useMutation({
		mutationFn: async () => {
			if (!nome.trim()) throw new Error("Nome da empresa é obrigatório.");
			if (!telefone.trim()) throw new Error("Telefone/WhatsApp é obrigatório.");
			return criarLeadServerFn({
				data: {
					nome: nome.trim(),
					telefone: telefone.replace(/\D/g, ""),
					cnpj: cnpj.replace(/\D/g, "") || undefined,
					cidade: cidade.trim() || undefined,
				},
			});
		},
		onSuccess: () => {
			onSuccess();
		},
		onError: (err: any) => {
			setErro(err?.message || "Erro ao cadastrar lead.");
		},
	});

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
			<Card className="w-full max-w-md bg-slate-900 border-slate-800 p-6 shadow-2xl">
				<div className="flex items-center justify-between pb-4 border-b border-slate-800">
					<h3 className="text-base font-bold text-white flex items-center gap-2">
						<span className="text-indigo-400">+</span> Novo Lead Manual
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-slate-400 hover:text-white text-sm"
					>
						✕
					</button>
				</div>

				{erro && (
					<div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
						{erro}
					</div>
				)}

				<form
					onSubmit={(e) => {
						e.preventDefault();
						criarMutation.mutate();
					}}
					className="mt-4 space-y-4 text-xs"
				>
					<div>
						<label className="block text-slate-300 font-semibold mb-1">
							Nome da Empresa / Contato *
						</label>
						<input
							type="text"
							required
							placeholder="Ex: Padaria Central"
							value={nome}
							onChange={(e) => setNome(e.target.value)}
							className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
						/>
					</div>

					<div>
						<label className="block text-slate-300 font-semibold mb-1">
							Telefone / WhatsApp *
						</label>
						<input
							type="text"
							required
							placeholder="(00) 00000-0000"
							value={telefone}
							onChange={(e) => setTelefone(maskPhone(e.target.value))}
							className="w-full font-mono rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-slate-300 font-semibold mb-1">
								CNPJ (Opcional)
							</label>
							<input
								type="text"
								placeholder="00.000.000/0000-00"
								value={cnpj}
								onChange={(e) => setCnpj(maskCpfCnpj(e.target.value))}
								className="w-full font-mono rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
							/>
						</div>
						<div>
							<label className="block text-slate-300 font-semibold mb-1">
								Cidade (Opcional)
							</label>
							<input
								type="text"
								placeholder="Ex: Ribeirão Preto/SP"
								value={cidade}
								onChange={(e) => setCidade(e.target.value)}
								className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
							/>
						</div>
					</div>

					<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={onClose}
							className="text-slate-300 hover:text-white"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							variant="primary"
							size="sm"
							disabled={criarMutation.isPending}
							className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
						>
							{criarMutation.isPending ? "Cadastrando..." : "Cadastrar Lead"}
						</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}
