import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import StatusBadge from "#/componentes/composicao/status_badge";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import { requireUserOrRedirect } from "#/lib/auth-helper";
import { formatDateBR } from "#/lib/format";
import {
	criarLeadServerFn,
	LEADS_PAGE_SIZES,
	listarLeadsServerFn,
} from "#/lib/leads";
import { maskCpfCnpj, maskPhone } from "#/lib/masks";
import { paginasVisiveis } from "#/lib/paginacao";
import { leadKeys } from "#/lib/query-keys";

// Campos opcionais: Links para /leads não precisam passar `search`.
// O validate abaixo sempre preenche os defaults em runtime.
interface LeadsSearch {
	page?: number;
	pageSize?: (typeof LEADS_PAGE_SIZES)[number];
	busca?: string;
	etapa?: string;
	origem?: string;
}

// Estado da listagem vive na URL — paginação e filtros sobrevivem a
// refresh/back button e são compartilháveis.
function validateLeadsSearch(raw: Record<string, unknown>): LeadsSearch {
	const page = Number(raw.page);
	const pageSize = Number(raw.pageSize);
	// Omite defaults — mantém a URL limpa e evita redirect de canonicalização.
	return {
		page: Number.isInteger(page) && page > 1 ? page : undefined,
		pageSize:
			(LEADS_PAGE_SIZES as readonly number[]).includes(pageSize) &&
			pageSize !== 30
				? (pageSize as LeadsSearch["pageSize"])
				: undefined,
		busca: typeof raw.busca === "string" && raw.busca ? raw.busca : undefined,
		etapa:
			typeof raw.etapa === "string" && raw.etapa !== "ALL"
				? raw.etapa
				: undefined,
		origem:
			typeof raw.origem === "string" && raw.origem !== "ALL"
				? raw.origem
				: undefined,
	};
}

export const Route = createFileRoute("/leads/")({
	validateSearch: validateLeadsSearch,
	beforeLoad: ({ location }) =>
		requireUserOrRedirect("/login", location.pathname),
	loaderDeps: ({ search }) => ({
		page: search.page ?? 1,
		pageSize: search.pageSize ?? 30,
		busca: search.busca ?? "",
		etapa: search.etapa ?? "ALL",
		origem: search.origem ?? "ALL",
	}),
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.ensureQueryData({
			queryKey: leadKeys.list(deps),
			queryFn: () => listarLeadsServerFn({ data: deps }),
		}),
	component: LeadsPage,
});

function LeadsPage() {
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	// `search` é opcional no tipo mas sempre preenchido pelo validate —
	// normaliza aqui para o resto da página trabalhar com valores certos.
	const page = search.page ?? 1;
	const pageSize = search.pageSize ?? 30;
	const busca = search.busca ?? "";
	const params = {
		page,
		pageSize,
		busca,
		etapa: search.etapa ?? "ALL",
		origem: search.origem ?? "ALL",
	};

	const { data } = useQuery({
		queryKey: leadKeys.list(params),
		queryFn: () => listarLeadsServerFn({ data: params }),
		staleTime: 30_000,
		placeholderData: keepPreviousData,
	});

	const leads = data?.items ?? [];
	const metricas = data?.metricas ?? {
		total: 0,
		novos: 0,
		qualificados: 0,
		propostas: 0,
	};
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;
	const inicio = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const fim = Math.min(page * pageSize, total);

	const setSearch = (partial: Partial<LeadsSearch>) =>
		navigate({
			search: (prev) => ({ ...prev, ...partial }),
			replace: true,
		});

	const criarLeadMutation = useMutation({
		mutationFn: (data: {
			nome: string;
			telefone: string;
			cnpj?: string;
			cidade?: string;
		}) => criarLeadServerFn({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: leadKeys.all }),
	});

	const [isModalOpen, setIsModalOpen] = useState(false);

	// Form novo lead manual
	const [newNome, setNewNome] = useState("");
	const [newTelefone, setNewTelefone] = useState("");
	const [newCnpj, setNewCnpj] = useState("");
	const [newCidade, setNewCidade] = useState("Ribeirão Preto/SP");

	// Busca com debounce — digita local, navega após parar de digitar.
	const [buscaInput, setBuscaInput] = useState(busca);
	useEffect(() => {
		if (buscaInput === busca) return;
		const t = setTimeout(
			() =>
				navigate({
					search: (prev) => ({ ...prev, busca: buscaInput, page: 1 }),
					replace: true,
				}),
			350,
		);
		return () => clearTimeout(t);
	}, [buscaInput, busca, navigate]);

	const handleAddManualLead = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newNome || !newTelefone) return;

		criarLeadMutation.mutate({
			nome: newNome,
			telefone: newTelefone.replace(/\D/g, ""),
			cnpj: newCnpj.replace(/\D/g, "") || undefined,
			cidade: newCidade,
		});

		setIsModalOpen(false);
		setNewNome("");
		setNewTelefone("");
		setNewCnpj("");
	};

	return (
		<AppShell
			title="Gestão de Leads"
			badge={`${total} leads`}
			actions={
				<div className="flex items-center gap-2">
					<Link to="/leads/garimpo">
						<Button variant="outline" size="sm">
							⛏️ Garimpo AIsa
						</Button>
					</Link>
					<Button
						variant="primary"
						size="sm"
						onClick={() => setIsModalOpen(true)}
					>
						+ Novo Lead Manual
					</Button>
				</div>
			}
		>
			<div className="space-y-6">
				{/* Métricas Rápidas */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
					<Card padding="sm">
						<span className="text-xs text-slate-400 font-medium block">
							Total de Leads
						</span>
						<span className="text-xl font-bold text-slate-100">
							{metricas.total}
						</span>
					</Card>
					<Card padding="sm">
						<span className="text-xs text-slate-400 font-medium block">
							Novos / Não contatados
						</span>
						<span className="text-xl font-bold text-indigo-400">
							{metricas.novos}
						</span>
					</Card>
					<Card padding="sm">
						<span className="text-xs text-slate-400 font-medium block">
							Qualificados
						</span>
						<span className="text-xl font-bold text-emerald-400">
							{metricas.qualificados}
						</span>
					</Card>
					<Card padding="sm">
						<span className="text-xs text-slate-400 font-medium block">
							Propostas Enviadas
						</span>
						<span className="text-xl font-bold text-amber-400">
							{metricas.propostas}
						</span>
					</Card>
				</div>

				{/* Barra de Filtros e Busca */}
				<Card padding="sm">
					<div className="flex flex-col md:flex-row items-center justify-between gap-4">
						<div className="relative flex-1 w-full">
							<span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
								🔍
							</span>
							<input
								type="text"
								placeholder="Buscar por nome, razão social ou CNPJ..."
								value={buscaInput}
								onChange={(e) => setBuscaInput(e.target.value)}
								className="w-full pl-9 pr-4 py-2 text-sm border border-slate-700 rounded-lg bg-slate-950 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
							/>
						</div>

						<div className="flex items-center gap-2 w-full md:w-auto">
							<select
								value={params.etapa}
								onChange={(e) => setSearch({ etapa: e.target.value, page: 1 })}
								className="w-full md:w-auto text-xs border border-slate-700 rounded-lg px-3 py-2 bg-slate-950 text-slate-200 focus:border-indigo-500 focus:outline-none"
							>
								<option value="ALL">Todas as Etapas</option>
								<option value="NOVO">Novo Lead</option>
								<option value="CONTATADO">Contatado</option>
								<option value="QUALIFICADO">Qualificado</option>
								<option value="PROPOSTA_ENVIADA">Proposta Enviada</option>
								<option value="FECHADO_GANHO">Convertido</option>
								<option value="FECHADO_PERDIDO">Perdido</option>
							</select>

							<select
								value={params.origem}
								onChange={(e) => setSearch({ origem: e.target.value, page: 1 })}
								className="w-full md:w-auto text-xs border border-slate-700 rounded-lg px-3 py-2 bg-slate-950 text-slate-200 focus:border-indigo-500 focus:outline-none"
							>
								<option value="ALL">Todas as Origens</option>
								<option value="MAPS">Google Maps / AIsa</option>
								<option value="CSV">Importação CSV</option>
								<option value="MANUAL">Manual</option>
								<option value="SITE">Site / Landing</option>
							</select>

							{(buscaInput ||
								params.etapa !== "ALL" ||
								params.origem !== "ALL") && (
								<button
									type="button"
									onClick={() => {
										setBuscaInput("");
										setSearch({
											busca: "",
											etapa: "ALL",
											origem: "ALL",
											page: 1,
										});
									}}
									className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 font-medium cursor-pointer"
								>
									Limpar
								</button>
							)}
						</div>
					</div>
				</Card>

				{/* Tabela de Leads */}
				<Card padding="none" className="overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse text-xs">
							<thead>
								<tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider">
									<th className="py-3 px-4">Nome / Empresa</th>
									<th className="py-3 px-4">CNPJ</th>
									<th className="py-3 px-4">Etapa</th>
									<th className="py-3 px-4">Contato</th>
									<th className="py-3 px-4">Origem</th>
									<th className="py-3 px-4">Data</th>
									<th className="py-3 px-4 text-right">Ações</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-800 font-sans">
								{leads.length === 0 ? (
									<tr>
										<td
											colSpan={7}
											className="py-12 text-center text-slate-500"
										>
											Nenhum lead encontrado para os filtros selecionados.
										</td>
									</tr>
								) : (
									leads.map((lead) => (
										<tr
											key={lead.id}
											className="hover:bg-slate-800/40 transition-colors"
										>
											<td className="py-3 px-4">
												<Link
													to="/leads/$id"
													params={{ id: lead.id }}
													className="font-bold text-slate-100 hover:text-indigo-400 block text-sm"
												>
													{lead.nome}
												</Link>
												{lead.razaoSocial && (
													<span className="text-[11px] text-slate-400 block truncate max-w-xs">
														{lead.razaoSocial}
													</span>
												)}
												<span className="text-[10px] text-slate-400 font-mono">
													{lead.cidade}
												</span>
											</td>

											<td className="py-3 px-4 font-mono text-slate-300">
												{lead.cnpj ? (
													maskCpfCnpj(lead.cnpj)
												) : (
													<span className="text-slate-600">-</span>
												)}
											</td>

											<td className="py-3 px-4">
												<StatusBadge status={lead.etapa} />
											</td>

											<td className="py-3 px-4 font-mono">
												<span className="text-slate-200 block">
													{maskPhone(lead.telefone)}
												</span>
												{lead.temWhatsapp && (
													<span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
														💬 WhatsApp
													</span>
												)}
											</td>

											<td className="py-3 px-4">
												<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
													{lead.origem}
												</span>
											</td>

											<td className="py-3 px-4 text-slate-400 font-mono">
												{formatDateBR(lead.createdAt)}
											</td>

											<td className="py-3 px-4 text-right">
												<Link to="/leads/$id" params={{ id: lead.id }}>
													<Button variant="ghost" size="sm">
														Abrir Lead →
													</Button>
												</Link>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{/* Paginação */}
					<div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
						<span>
							Mostrando{" "}
							<span className="font-semibold text-slate-200">
								{inicio}–{fim}
							</span>{" "}
							de <span className="font-semibold text-slate-200">{total}</span>{" "}
							leads
						</span>

						<div className="flex items-center gap-2">
							<label htmlFor="leads-page-size">Por página</label>
							<select
								id="leads-page-size"
								value={pageSize}
								onChange={(e) =>
									setSearch({
										pageSize: Number(e.target.value) as LeadsSearch["pageSize"],
										page: 1,
									})
								}
								className="border border-slate-700 rounded-lg px-2 py-1 bg-slate-950 text-slate-200 focus:border-indigo-500 focus:outline-none"
							>
								{LEADS_PAGE_SIZES.map((size) => (
									<option key={size} value={size}>
										{size}
									</option>
								))}
							</select>
						</div>

						<div className="flex items-center gap-1">
							<button
								type="button"
								disabled={page <= 1}
								onClick={() => setSearch({ page: page - 1 })}
								className="px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
								aria-label="Página anterior"
							>
								‹
							</button>
							{paginasVisiveis(page, totalPages).map((p, i, arr) =>
								p === "…" ? (
									<span
										key={`gap-${arr[i - 1]}`}
										className="px-1 text-slate-600"
									>
										…
									</span>
								) : (
									<button
										key={p}
										type="button"
										onClick={() => setSearch({ page: p })}
										className={`min-w-7 px-2 py-1 rounded-lg border cursor-pointer ${
											p === page
												? "border-indigo-500 bg-indigo-500/20 text-indigo-300 font-semibold"
												: "border-slate-700 hover:bg-slate-800"
										}`}
									>
										{p}
									</button>
								),
							)}
							<button
								type="button"
								disabled={page >= totalPages}
								onClick={() => setSearch({ page: page + 1 })}
								className="px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
								aria-label="Próxima página"
							>
								›
							</button>
						</div>
					</div>
				</Card>
			</div>

			{/* Modal Cadastro Manual (P0-001/P0-002: Máscaras e a11y corrigidos) */}
			{isModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="modal-novo-lead-title"
				>
					<div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-800 text-slate-200">
						<h3
							id="modal-novo-lead-title"
							className="text-lg font-bold text-slate-100 mb-1"
						>
							Cadastrar Lead Manual
						</h3>
						<p className="text-xs text-slate-400 mb-4">
							Insira os dados cadastrais básicos para iniciar o contato.
						</p>

						<form onSubmit={handleAddManualLead} className="space-y-4">
							<div>
								<label
									htmlFor="lead-modal-nome"
									className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1"
								>
									Nome / Nome Fantasia *
								</label>
								<input
									id="lead-modal-nome"
									type="text"
									required
									placeholder="Ex: Padaria Central"
									value={newNome}
									onChange={(e) => setNewNome(e.target.value)}
									className="w-full text-sm border border-slate-700 bg-slate-950 text-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="lead-modal-tel"
									className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1"
								>
									Telefone / WhatsApp *
								</label>
								<input
									id="lead-modal-tel"
									type="text"
									required
									placeholder="(16) 99602-9107"
									value={newTelefone}
									onChange={(e) => setNewTelefone(maskPhone(e.target.value))}
									className="w-full text-sm font-mono border border-slate-700 bg-slate-950 text-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="lead-modal-cnpj"
									className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1"
								>
									CNPJ (opcional)
								</label>
								<input
									id="lead-modal-cnpj"
									type="text"
									placeholder="00.000.000/0000-00"
									value={newCnpj}
									onChange={(e) => setNewCnpj(maskCpfCnpj(e.target.value))}
									className="w-full text-sm font-mono border border-slate-700 bg-slate-950 text-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="lead-modal-cidade"
									className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1"
								>
									Cidade / UF
								</label>
								<input
									id="lead-modal-cidade"
									type="text"
									value={newCidade}
									onChange={(e) => setNewCidade(e.target.value)}
									className="w-full text-sm border border-slate-700 bg-slate-950 text-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
								/>
							</div>

							<div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setIsModalOpen(false)}
								>
									Cancelar
								</Button>
								<Button type="submit" variant="primary" size="sm">
									Salvar Lead
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</AppShell>
	);
}
