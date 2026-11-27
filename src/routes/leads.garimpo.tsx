import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import {
	executarGarimpoServerFn,
	importarGarimpadosServerFn,
	type LeadGarimpado,
	type MotorGarimpo,
} from "#/lib/aisa";
import { requireUserOrRedirect } from "#/lib/auth-helper";
import {
	type CsvImportErro,
	type CsvImportResponse,
	contarLinhas,
	formatarTamanho,
	parsearCsv,
} from "#/lib/csv";
import {
	importarLeadsLoteServerFn,
	importarLoteDiscoServerFn,
	infoCsvDiscoServerFn,
} from "#/lib/csv-import";
import {
	ESTADOS_BRASIL,
	fetchMunicipiosIBGE,
	formatarLocalizacaoApollo,
	formatarLocalizacaoGoogleMaps,
	type MunicipioIBGE,
} from "#/lib/localidades";
import { leadKeys } from "#/lib/query-keys";

export const Route = createFileRoute("/leads/garimpo")({
	beforeLoad: ({ location }) =>
		requireUserOrRedirect("/login", location.pathname),
	component: LeadsGarimpoPage,
});

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB
const LOTE_IMPORTACAO = 100; // linhas por chamada RPC (barra de progresso)

interface CsvProgress {
	total: number;
	processados: number;
	importados: number;
	atualizados: number;
	erros: CsvImportErro[];
}

interface CsvPreview {
	fileName: string;
	fileSize: number;
	totalLinhas: number;
	conteudo: string;
}

function LeadsGarimpoPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [motor, setMotor] = useState<MotorGarimpo>("APOLLO");

	// Localização via API pública do IBGE
	const [selectedUf, setSelectedUf] = useState("SP");
	const [selectedCidade, setSelectedCidade] = useState("Ribeirão Preto");
	const [municipios, setMunicipios] = useState<MunicipioIBGE[]>([]);
	const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false);

	// Parâmetros Motor 1: Apollo B2B
	const [apolloTagsInput, setApolloTagsInput] = useState(
		"agronegocio, tecnologia",
	);
	const [apolloLocation, setApolloLocation] = useState(
		"Ribeirão Preto, São Paulo, Brazil",
	);
	const [apolloPerPage, setApolloPerPage] = useState(15);

	// Parâmetros Motor 2: Google Maps Places API (direto, GOOGLE_MAPS_API_KEY do env)
	const [gmapsQuery, setGmapsQuery] = useState("clinicas em Ribeirão Preto");
	const [gmapsRadius, setGmapsRadius] = useState(10000);
	const [gmapsMaxResults, setGmapsMaxResults] = useState(15);

	// Estado dos Resultados e Busca
	const [isSearching, setIsSearching] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [results, setResults] = useState<LeadGarimpado[]>([]);

	// CSV import state
	const [isImportingCsv, setIsImportingCsv] = useState(false);
	const [csvResult, setCsvResult] = useState<CsvImportResponse | null>(null);

	// CSV upload via file input (preview ANTES do upload)
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
	const [csvErro, setCsvErro] = useState<string | null>(null);
	const [isUploadingCsv, setIsUploadingCsv] = useState(false);
	const [csvProgress, setCsvProgress] = useState<CsvProgress | null>(null);

	// Efeito para carregar municípios do IBGE quando o estado muda
	useEffect(() => {
		let isMounted = true;
		setIsLoadingMunicipios(true);

		fetchMunicipiosIBGE(selectedUf).then((lista) => {
			if (!isMounted) return;
			setMunicipios(lista);
			setIsLoadingMunicipios(false);

			const existe = lista.some(
				(m) => m.nome.toLowerCase() === selectedCidade.toLowerCase(),
			);
			const novaCidade = existe
				? selectedCidade
				: lista.find((m) => m.nome === "Ribeirão Preto")?.nome ||
					lista[0]?.nome ||
					selectedCidade;

			setSelectedCidade(novaCidade);

			const estadoObj = ESTADOS_BRASIL.find((e) => e.sigla === selectedUf);
			const estadoNome = estadoObj?.nome || "São Paulo";
			setApolloLocation(formatarLocalizacaoApollo(novaCidade, estadoNome));
		});

		return () => {
			isMounted = false;
		};
	}, [selectedUf]);

	// Atualiza cidade e formata a string de localização do Apollo
	const handleCidadeChange = (novaCidade: string) => {
		setSelectedCidade(novaCidade);
		const estadoObj = ESTADOS_BRASIL.find((e) => e.sigla === selectedUf);
		const estadoNome = estadoObj?.nome || "São Paulo";
		setApolloLocation(formatarLocalizacaoApollo(novaCidade, estadoNome));
	};

	// Alterna o motor de busca (definido junto aos handlers de CSV abaixo)

	// Location canônica para Google Maps (sempre derivado do select UF+Cidade)
	const googleLocation = (() => {
		const estadoObj = ESTADOS_BRASIL.find((e) => e.sigla === selectedUf);
		return formatarLocalizacaoGoogleMaps(
			selectedCidade,
			estadoObj?.nome ?? "São Paulo",
		);
	})();

	// Executa busca via server function — dispatch pelo motor escolhido
	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSearching(true);
		setStatusMessage(null);

		try {
			const payload =
				motor === "APOLLO"
					? {
							motor,
							tags: apolloTagsInput
								.split(",")
								.map((t) => t.trim())
								.filter(Boolean),
							localizacaoApollo: apolloLocation,
							perPage: apolloPerPage,
						}
					: {
							motor,
							mapsKeyword: gmapsQuery,
							googleLocation,
							googleRadius: gmapsRadius,
							googleMaxResults: gmapsMaxResults,
						};

			const resp = await executarGarimpoServerFn({ data: payload });

			if (resp.success && resp.leads.length > 0) {
				setResults(resp.leads);
				const custo = resp.costEstimate ? ` · custo ${resp.costEstimate}` : "";
				setStatusMessage(
					`${resp.message ?? `${resp.leads.length} leads retornados.`}${custo}`,
				);
			} else {
				setResults([]);
				setStatusMessage(
					resp.error || "Nenhum lead encontrado para os parâmetros informados.",
				);
			}
		} catch (err: any) {
			setResults([]);
			setStatusMessage(
				`Falha na busca pelo servidor: ${err.message || String(err)}`,
			);
		} finally {
			setIsSearching(false);
		}
	};

	// Importar leads do CSV em disco — EM LOTES para barra de progresso real
	const handleImportCsv = async () => {
		setIsImportingCsv(true);
		setCsvResult(null);
		setCsvProgress(null);
		try {
			const info = await infoCsvDiscoServerFn();
			if (!info.ok) {
				setCsvResult({
					success: false,
					filePath: info.filePath,
					fileSize: info.fileSize,
					totalLinhas: 0,
					importados: 0,
					atualizados: 0,
					erros: [
						{
							linha: 0,
							razao_social: "",
							motivo: info.motivo ?? "Falha ao ler CSV do disco",
						},
					],
					message: info.motivo ?? "Arquivo CSV não encontrado",
				});
				return;
			}

			const total = info.totalLinhas;
			let importados = 0;
			let atualizados = 0;
			const erros: CsvImportErro[] = [];

			setCsvProgress({ total, processados: 0, importados, atualizados, erros });

			for (let offset = 0; offset < total; offset += LOTE_IMPORTACAO) {
				const r = await importarLoteDiscoServerFn({
					data: { offset, limit: LOTE_IMPORTACAO },
				});
				importados += r.importados;
				atualizados += r.atualizados;
				erros.push(...r.erros);
				setCsvProgress({
					total,
					processados: Math.min(offset + LOTE_IMPORTACAO, total),
					importados,
					atualizados,
					erros: [...erros],
				});
			}

			setCsvResult({
				success: true,
				filePath: info.filePath,
				fileSize: info.fileSize,
				totalLinhas: total,
				importados,
				atualizados,
				erros,
				message: `${importados} importados, ${atualizados} atualizados, ${erros.length} erro(s)`,
			});
		} catch (err: any) {
			setCsvResult({
				success: false,
				totalLinhas: 0,
				importados: 0,
				atualizados: 0,
				erros: [
					{ linha: 0, razao_social: "", motivo: err.message ?? String(err) },
				],
				message: "Falha ao importar CSV",
			});
		} finally {
			setIsImportingCsv(false);
			setCsvProgress(null);
		}
	};

	// Lê o arquivo no client, conta linhas e mostra preview ANTES de enviar
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setCsvErro(null);
		setCsvResult(null);
		setCsvPreview(null);
		setCsvProgress(null);

		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > MAX_UPLOAD_BYTES) {
			setCsvErro(
				`Arquivo muito grande: ${formatarTamanho(file.size)} (máx ${formatarTamanho(MAX_UPLOAD_BYTES)}). Use o modo "caminho fixo" para volumes maiores.`,
			);
			if (fileInputRef.current) fileInputRef.current.value = "";
			return;
		}

		if (!file.name.toLowerCase().endsWith(".csv")) {
			setCsvErro("Selecione um arquivo com extensão .csv");
			if (fileInputRef.current) fileInputRef.current.value = "";
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const conteudo = String(reader.result ?? "");
			const totalLinhas = contarLinhas(conteudo);
			setCsvPreview({
				fileName: file.name,
				fileSize: file.size,
				totalLinhas,
				conteudo,
			});
		};
		reader.onerror = () => {
			setCsvErro(
				`Não foi possível ler o arquivo: ${reader.error?.message ?? "erro desconhecido"}`,
			);
		};
		reader.readAsText(file, "utf-8");
	};

	// Confirma o upload: faz parse no client e envia EM LOTES com progresso.
	// O servidor checa dedup (telefone/e-mail) por linha: existe → atualiza,
	// não existe → cria.
	const handleConfirmarUpload = async () => {
		if (!csvPreview) return;
		setIsUploadingCsv(true);
		setCsvResult(null);
		setCsvProgress(null);

		const parse = parsearCsv(csvPreview.conteudo);
		const errosParse: CsvImportErro[] = parse.erros.map((e) => ({
			linha: e.linha,
			razao_social: "",
			motivo: e.motivo,
		}));

		if (!parse.ok) {
			setCsvResult({
				success: false,
				fileName: csvPreview.fileName,
				fileSize: csvPreview.fileSize,
				totalLinhas: 0,
				importados: 0,
				atualizados: 0,
				erros: errosParse,
				message: "CSV malformado",
			});
			setIsUploadingCsv(false);
			return;
		}

		const total = parse.linhas.length;
		let importados = 0;
		let atualizados = 0;
		const erros: CsvImportErro[] = [...errosParse];

		setCsvProgress({ total, processados: 0, importados, atualizados, erros });

		try {
			for (let offset = 0; offset < total; offset += LOTE_IMPORTACAO) {
				const linhas = parse.linhas.slice(offset, offset + LOTE_IMPORTACAO);
				const r = await importarLeadsLoteServerFn({ data: { linhas } });
				importados += r.importados;
				atualizados += r.atualizados;
				erros.push(...r.erros);
				setCsvProgress({
					total,
					processados: Math.min(offset + LOTE_IMPORTACAO, total),
					importados,
					atualizados,
					erros: [...erros],
				});
			}

			setCsvResult({
				success: true,
				fileName: csvPreview.fileName,
				fileSize: csvPreview.fileSize,
				totalLinhas: total,
				importados,
				atualizados,
				erros,
				message: `${importados} importados, ${atualizados} atualizados, ${erros.length} erro(s)`,
			});
		} catch (err: any) {
			setCsvResult({
				success: false,
				fileName: csvPreview.fileName,
				fileSize: csvPreview.fileSize,
				totalLinhas: total,
				importados,
				atualizados,
				erros: [
					...erros,
					{ linha: 0, razao_social: "", motivo: err.message ?? String(err) },
				],
				message: "Falha no upload",
			});
		} finally {
			setIsUploadingCsv(false);
			setCsvProgress(null);
		}
	};

	// Limpa o preview e reseta o input file
	const handleLimparPreview = () => {
		setCsvPreview(null);
		setCsvErro(null);
		setCsvResult(null);
		setCsvProgress(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	// Trocar para CSV também limpa o preview de busca
	const handleSwitchMotor = (novoMotor: MotorGarimpo) => {
		setMotor(novoMotor);
		setStatusMessage(null);
		setResults([]);
		if (novoMotor !== "CSV") {
			setCsvResult(null);
			setCsvProgress(null);
		}
	};

	const toggleSelect = (id: string) => {
		setResults(
			results.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)),
		);
	};

	const selectAll = (select: boolean) => {
		setResults(results.map((r) => ({ ...r, selected: select })));
	};

	const selectOnlyWithPhone = () => {
		setResults(results.map((r) => ({ ...r, selected: r.temTelefone })));
	};

	const selectedCount = results.filter((r) => r.selected).length;
	const selectedWithPhone = results.filter(
		(r) => r.selected && r.temTelefone,
	).length;

	const handleImport = async () => {
		if (selectedCount === 0 || isImporting) return;
		setIsImporting(true);
		setStatusMessage(null);
		try {
			const selecionados = results
				.filter((r) => r.selected)
				.map((r) => ({
					nome: r.nome,
					razaoSocial: r.razaoSocial,
					dominio: r.dominio,
					telefone: r.telefone,
					endereco: r.endereco,
					cidade: r.cidade,
					estado: r.estado,
					setor: r.setor,
					porteFuncionarios: r.porteFuncionarios,
					motor: r.motor,
				}));
			const r = await importarGarimpadosServerFn({
				data: { leads: selecionados },
			});
			await queryClient.invalidateQueries({ queryKey: leadKeys.all });
			setStatusMessage(
				`${r.importados} lead(s) importado(s), ${r.atualizados} atualizado(s)` +
					(r.erros.length > 0 ? `, ${r.erros.length} erro(s)` : "") +
					".",
			);
			navigate({ to: "/leads" });
		} catch (err) {
			setStatusMessage(
				`Erro ao importar: ${err instanceof Error ? err.message : String(err)}`,
			);
		} finally {
			setIsImporting(false);
		}
	};

	const estimatedCost =
		motor === "APOLLO"
			? "~US$ 0.019/empresa"
			: motor === "GOOGLE_MAPS_PLACES"
				? "~US$ 0.032 + US$ 0.017/local"
				: "~US$ 0.020/resultado";

	return (
		<AppShell
			title="Central de Garimpo de Leads"
			badge={
				motor === "APOLLO"
					? "B2B Corporativo (AIsa → Apollo)"
					: motor === "GOOGLE_MAPS_PLACES"
						? "Negócios Locais (Google Maps Places API)"
						: "Importação em massa via CSV"
			}
			actions={
				<div className="flex items-center gap-2">
					<Link to="/leads/funil">
						<Button variant="outline" size="sm" className="text-slate-300">
							⊞ Ver Funil
						</Button>
					</Link>
					<Link to="/leads">
						<Button variant="outline" size="sm">
							← Voltar para Leads
						</Button>
					</Link>
				</div>
			}
		>
			<div className="max-w-5xl mx-auto space-y-6">
				{/* Painel do Motor de Prospecção */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs">
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-sm font-bold text-slate-100">
								Motor de Descoberta
							</h2>
							<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
								<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
								Motor Ativo
							</span>
						</div>
						<p className="text-xs text-slate-400 mt-0.5">
							Escolha entre prospecção corporativa B2B e estabelecimentos
							comerciais locais
						</p>
					</div>

					<div className="inline-flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">
						<button
							type="button"
							onClick={() => handleSwitchMotor("APOLLO")}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
								motor === "APOLLO"
									? "bg-indigo-600 text-white shadow-xs"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							<span>🏢 B2B Corporativo</span>
							<span className="text-[10px] text-indigo-200 font-mono">
								AIsa · Apollo
							</span>
						</button>

						<button
							type="button"
							onClick={() => handleSwitchMotor("GOOGLE_MAPS_PLACES")}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
								motor === "GOOGLE_MAPS_PLACES"
									? "bg-emerald-600 text-white shadow-xs"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							<span>📍 Google Maps</span>
							<span className="text-[10px] text-emerald-200 font-mono">
								Places API
							</span>
						</button>

						<button
							type="button"
							onClick={() => handleSwitchMotor("CSV")}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
								motor === "CSV"
									? "bg-amber-600 text-white shadow-xs"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							<span>📄 Importar CSV</span>
							<span className="text-[10px] text-amber-200 font-mono">
								em massa
							</span>
						</button>
					</div>
				</div>

				{/* Formulário Motor 1: Apollo B2B */}
				{motor === "APOLLO" && (
					<Card
						header={
							<div className="flex items-center justify-between w-full">
								<div>
									<h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
										Prospecção B2B (Médias e Grandes Empresas)
									</h3>
									<p className="text-xs text-slate-400">
										Filtre empresas por setor, localização e porte
									</p>
								</div>
								<div className="text-right font-mono text-xs">
									<span className="text-slate-400 block text-[10px]">
										CUSTO ESTIMADO
									</span>
									<span className="font-bold text-emerald-400">
										{estimatedCost} / lote
									</span>
								</div>
							</div>
						}
					>
						<form onSubmit={handleSearch} className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="md:col-span-2">
									<label
										htmlFor="apollo-tags"
										className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
									>
										Setor ou Palavras-chave (Opcional)
									</label>
									<input
										id="apollo-tags"
										type="text"
										placeholder="Deixe em branco para buscar todas as empresas, ou ex: tecnologia, agronegocio"
										value={apolloTagsInput}
										onChange={(e) => setApolloTagsInput(e.target.value)}
										className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
									<div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
										<span className="font-medium text-slate-400">
											Sugestões:
										</span>
										<button
											type="button"
											onClick={() =>
												setApolloTagsInput(
													"agronegocio, bioenergia, cooperativa",
												)
											}
											className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
										>
											• Agronegócio & Bioenergia
										</button>
										<button
											type="button"
											onClick={() =>
												setApolloTagsInput("tecnologia, software, saas")
											}
											className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
										>
											• Software & Tech
										</button>
										<button
											type="button"
											onClick={() =>
												setApolloTagsInput("saude, hospital, odontologia")
											}
											className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
										>
											• Saúde & Clínicas
										</button>
									</div>
								</div>

								<div className="space-y-2">
									<div className="grid grid-cols-2 gap-2">
										<div>
											<label
												htmlFor="apollo-uf"
												className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
											>
												Estado
											</label>
											<select
												id="apollo-uf"
												value={selectedUf}
												onChange={(e) => setSelectedUf(e.target.value)}
												className="w-full text-xs border border-slate-700 rounded-lg px-2.5 py-2 bg-slate-950 text-slate-200 focus:border-indigo-500 focus:outline-none"
											>
												{ESTADOS_BRASIL.map((est) => (
													<option key={est.sigla} value={est.sigla}>
														{est.sigla} - {est.nome}
													</option>
												))}
											</select>
										</div>

										<div>
											<label
												htmlFor="apollo-cidade"
												className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
											>
												Cidade {isLoadingMunicipios ? "⏳" : ""}
											</label>
											<select
												id="apollo-cidade"
												value={selectedCidade}
												onChange={(e) => handleCidadeChange(e.target.value)}
												disabled={isLoadingMunicipios}
												className="w-full text-xs border border-slate-700 rounded-lg px-2.5 py-2 bg-slate-950 text-slate-200 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
											>
												{isLoadingMunicipios ? (
													<option value="">Carregando...</option>
												) : (
													municipios.map((m) => (
														<option key={m.id} value={m.nome}>
															{m.nome}
														</option>
													))
												)}
											</select>
										</div>
									</div>

									<p className="text-[10px] text-slate-400 truncate">
										Localidade: {apolloLocation}
									</p>
								</div>
							</div>

							<div className="flex items-center justify-between pt-2 border-t border-slate-800">
								<div className="flex items-center gap-2 text-xs">
									<span className="text-slate-300">Empresas por lote:</span>
									<select
										value={apolloPerPage}
										onChange={(e) => setApolloPerPage(Number(e.target.value))}
										className="border border-slate-700 rounded px-2 py-1 bg-slate-950 text-slate-200"
									>
										<option value={15}>15 empresas (Econômico)</option>
										<option value={25}>25 empresas</option>
										<option value={50}>50 empresas</option>
									</select>
								</div>

								<Button
									type="submit"
									variant="primary"
									size="md"
									isLoading={isSearching}
								>
									Buscar Empresas B2B →
								</Button>
							</div>
						</form>
					</Card>
				)}

				{/* Formulário Motor 2: Google Maps Places API (direto, GOOGLE_MAPS_API_KEY do env) */}
				{motor === "GOOGLE_MAPS_PLACES" && (
					<Card
						header={
							<div className="flex items-center justify-between w-full">
								<div>
									<h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
										Google Maps Places API — Direto
									</h3>
									<p className="text-xs text-slate-400">
										Estabelecimentos com telefone e website. Chave
										GOOGLE_MAPS_API_KEY do .env.
									</p>
								</div>
								<div className="text-right font-mono text-xs">
									<span className="text-slate-400 block text-[10px]">
										CUSTO ESTIMADO
									</span>
									<span className="font-bold text-emerald-400">
										{estimatedCost}
									</span>
								</div>
							</div>
						}
					>
						<form onSubmit={handleSearch} className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="md:col-span-2">
									<label
										htmlFor="gmaps-query"
										className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
									>
										Termo de Busca (Place Text Search) *
									</label>
									<input
										id="gmaps-query"
										type="text"
										required
										placeholder="Ex: clinicas, padarias centro, oficinas mecanicas"
										value={gmapsQuery}
										onChange={(e) => setGmapsQuery(e.target.value)}
										className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
									/>
									<div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
										<span className="font-medium text-slate-400">
											Sugestões:
										</span>
										<button
											type="button"
											onClick={() => setGmapsQuery("restaurantes")}
											className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
										>
											• Restaurantes
										</button>
										<button
											type="button"
											onClick={() => setGmapsQuery("academias")}
											className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
										>
											• Academias
										</button>
										<button
											type="button"
											onClick={() => setGmapsQuery("imobiliárias")}
											className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
										>
											• Imobiliárias
										</button>
									</div>
								</div>

								<div className="space-y-2">
									<div className="grid grid-cols-2 gap-2">
										<div>
											<label
												htmlFor="gmaps-uf"
												className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
											>
												Estado
											</label>
											<select
												id="gmaps-uf"
												value={selectedUf}
												onChange={(e) => setSelectedUf(e.target.value)}
												className="w-full text-xs border border-slate-700 rounded-lg px-2.5 py-2 bg-slate-950 text-slate-200 focus:border-emerald-500 focus:outline-none"
											>
												{ESTADOS_BRASIL.map((est) => (
													<option key={est.sigla} value={est.sigla}>
														{est.sigla} - {est.nome}
													</option>
												))}
											</select>
										</div>

										<div>
											<label
												htmlFor="gmaps-cidade"
												className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
											>
												Cidade {isLoadingMunicipios ? "⏳" : ""}
											</label>
											<select
												id="gmaps-cidade"
												value={selectedCidade}
												onChange={(e) => handleCidadeChange(e.target.value)}
												disabled={isLoadingMunicipios}
												className="w-full text-xs border border-slate-700 rounded-lg px-2.5 py-2 bg-slate-950 text-slate-200 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
											>
												{isLoadingMunicipios ? (
													<option value="">Carregando...</option>
												) : (
													municipios.map((m) => (
														<option key={m.id} value={m.nome}>
															{m.nome}
														</option>
													))
												)}
											</select>
										</div>
									</div>

									<p className="text-[10px] text-slate-400 truncate">
										Localidade canônica:{" "}
										<span className="font-mono text-slate-300">
											{googleLocation}
										</span>
									</p>
								</div>
							</div>

							<div className="flex items-center justify-between pt-2 border-t border-slate-800">
								<div className="flex items-center gap-3 text-xs">
									<label className="flex items-center gap-2 text-slate-300">
										Raio:
										<select
											value={gmapsRadius}
											onChange={(e) => setGmapsRadius(Number(e.target.value))}
											className="border border-slate-700 rounded px-2 py-1 bg-slate-950 text-slate-200"
										>
											<option value={5000}>5 km</option>
											<option value={10000}>10 km</option>
											<option value={20000}>20 km</option>
											<option value={50000}>50 km</option>
										</select>
									</label>
									<label className="flex items-center gap-2 text-slate-300">
										Máx:
										<select
											value={gmapsMaxResults}
											onChange={(e) =>
												setGmapsMaxResults(Number(e.target.value))
											}
											className="border border-slate-700 rounded px-2 py-1 bg-slate-950 text-slate-200"
										>
											<option value={15}>15 resultados</option>
											<option value={30}>30 resultados</option>
											<option value={60}>60 (máx Google)</option>
										</select>
									</label>
								</div>

								<Button
									type="submit"
									variant="primary"
									size="md"
									isLoading={isSearching}
								>
									Buscar no Google Maps API →
								</Button>
							</div>
						</form>
					</Card>
				)}

				{/* Aba: Importar CSV — upload via input com preview antes de enviar */}
				{motor === "CSV" && (
					<Card
						header={
							<div className="flex items-center justify-between w-full">
								<div>
									<h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
										Importar leads via CSV
									</h3>
									<p className="text-xs text-slate-400">
										Selecione um arquivo. O conteúdo é lido no navegador, as
										linhas são contadas e o preview aparece antes do upload.
									</p>
								</div>
								<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
									Em massa
								</span>
							</div>
						}
					>
						<div className="space-y-3">
							{/* File input + formato esperado */}
							<div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-3">
								<div>
									<label
										htmlFor="csv-file-input"
										className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
									>
										Arquivo CSV
									</label>
									<input
										ref={fileInputRef}
										id="csv-file-input"
										type="file"
										accept=".csv,text/csv"
										onChange={handleFileChange}
										className="block w-full text-xs text-slate-200 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer cursor-pointer"
									/>
									<p className="mt-1 text-[10px] text-slate-500">
										Limite: {formatarTamanho(MAX_UPLOAD_BYTES)} (acima disso,
										use o modo "caminho fixo")
									</p>
								</div>
								<div className="text-slate-400 text-[11px]">
									Formato esperado (separador{" "}
									<code className="font-mono">;</code>):
									<code className="block mt-1 font-mono text-slate-500">
										razao_social;nome_titular;email;telefone
									</code>
								</div>
							</div>

							{/* Erro de validação do arquivo */}
							{csvErro && (
								<p
									role="alert"
									className="text-xs text-red-400 px-3 py-2 rounded border border-red-500/30 bg-red-500/10"
								>
									{csvErro}
								</p>
							)}

							{/* Barra de progresso do salvamento em lote */}
							{csvProgress && (
								<div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
									<div className="flex items-center justify-between text-[11px]">
										<span className="font-semibold text-slate-300 uppercase tracking-wider">
											Salvando no banco…
										</span>
										<span className="font-mono text-slate-400">
											{csvProgress.processados.toLocaleString("pt-BR")} /{" "}
											{csvProgress.total.toLocaleString("pt-BR")} linhas
										</span>
									</div>
									<div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
										<div
											className="h-full rounded-full bg-emerald-500 transition-all duration-200"
											style={{
												width: `${
													csvProgress.total > 0
														? Math.round(
																(csvProgress.processados / csvProgress.total) *
																	100,
															)
														: 0
												}%`,
											}}
										/>
									</div>
									<div className="flex gap-3 font-mono text-[10px]">
										<span className="text-emerald-400">
											{csvProgress.importados.toLocaleString("pt-BR")}{" "}
											importados
										</span>
										<span className="text-indigo-400">
											{csvProgress.atualizados.toLocaleString("pt-BR")}{" "}
											atualizados
										</span>
										<span className="text-red-400">
											{csvProgress.erros.length.toLocaleString("pt-BR")} erros
										</span>
									</div>
								</div>
							)}

							{/* Preview ANTES do upload — mostra linhas/nome/tamanho */}
							{csvPreview && !csvResult && (
								<div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
									<div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-wider">
										<span>👁 Preview antes do envio</span>
									</div>
									<div className="grid grid-cols-3 gap-3 text-xs">
										<div>
											<div className="text-slate-500 text-[10px]">ARQUIVO</div>
											<div
												className="font-mono text-slate-100 truncate"
												title={csvPreview.fileName}
											>
												{csvPreview.fileName}
											</div>
										</div>
										<div>
											<div className="text-slate-500 text-[10px]">TAMANHO</div>
											<div className="font-mono text-slate-100">
												{formatarTamanho(csvPreview.fileSize)}
											</div>
										</div>
										<div>
											<div className="text-slate-500 text-[10px]">
												LINHAS DE DADOS
											</div>
											<div className="font-mono text-emerald-400 text-lg font-bold">
												{csvPreview.totalLinhas.toLocaleString("pt-BR")}
											</div>
										</div>
									</div>

									<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
										<Button
											type="button"
											variant="primary"
											size="md"
											onClick={handleConfirmarUpload}
											isLoading={isUploadingCsv}
										>
											{isUploadingCsv
												? "Enviando…"
												: `Confirmar e enviar ${csvPreview.totalLinhas.toLocaleString("pt-BR")} leads →`}
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={handleLimparPreview}
											disabled={isUploadingCsv}
										>
											Cancelar / escolher outro
										</Button>
									</div>
								</div>
							)}

							{/* Resultado do upload */}
							{csvResult && (
								<div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs space-y-2">
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
										<div>
											<div className="text-slate-500 text-[10px]">
												LINHAS DE DADOS
											</div>
											<div className="font-mono text-slate-200">
												{csvResult.totalLinhas.toLocaleString("pt-BR")}
											</div>
										</div>
										<div>
											<div className="text-slate-500 text-[10px]">
												IMPORTADOS
											</div>
											<div className="font-mono text-emerald-400">
												{csvResult.importados.toLocaleString("pt-BR")}
											</div>
										</div>
										<div>
											<div className="text-slate-500 text-[10px]">
												ATUALIZADOS
											</div>
											<div className="font-mono text-indigo-400">
												{csvResult.atualizados.toLocaleString("pt-BR")}
											</div>
										</div>
										<div>
											<div className="text-slate-500 text-[10px]">ERROS</div>
											<div className="font-mono text-red-400">
												{csvResult.erros.length.toLocaleString("pt-BR")}
											</div>
										</div>
									</div>

									{csvResult.erros.length > 0 && (
										<details className="mt-2">
											<summary className="cursor-pointer text-slate-400 hover:text-slate-200">
												Ver erros (
												{csvResult.erros.length.toLocaleString("pt-BR")})
											</summary>
											<ul className="mt-2 space-y-1 text-[11px] font-mono text-red-300 max-h-40 overflow-y-auto">
												{csvResult.erros.slice(0, 50).map((e) => (
													<li key={`${e.linha}-${e.razao_social}`}>
														linha {e.linha}: {e.razao_social || "(sem nome)"} —{" "}
														{e.motivo}
													</li>
												))}
											</ul>
										</details>
									)}

									<button
										type="button"
										onClick={handleLimparPreview}
										className="text-xs text-slate-400 hover:text-slate-200 underline"
									>
										Importar outro arquivo
									</button>
								</div>
							)}

							{/* Modo secundário: caminho fixo no disco (sem limite de tamanho) */}
							<details className="rounded-lg border border-slate-800 bg-slate-950/50">
								<summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-200 px-3 py-2 select-none">
									Modo alternativo: caminho fixo no disco
								</summary>
								<div className="px-3 pb-3 pt-1 space-y-2">
									<div className="text-[11px] font-mono text-slate-400">
										Lê o arquivo{" "}
										<code className="text-emerald-300">
											/home/kingdev/Documentos/csv.csv
										</code>{" "}
										diretamente do servidor (sem limite de tamanho).
									</div>
									<div className="flex items-center gap-3">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={handleImportCsv}
											isLoading={isImportingCsv}
										>
											{isImportingCsv
												? "Importando…"
												: "Importar do caminho padrão"}
										</Button>
									</div>
								</div>
							</details>
						</div>
					</Card>
				)}

				{/* Mensagem de Feedback de Busca (apenas nos motores de busca) */}
				{statusMessage && motor !== "CSV" && (
					<div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 flex items-center justify-between">
						<span>ℹ️ {statusMessage}</span>
						<button
							type="button"
							onClick={() => setStatusMessage(null)}
							aria-label="Fechar mensagem de status"
							className="text-slate-400 hover:text-slate-100 text-xs ml-2 cursor-pointer"
						>
							✕
						</button>
					</div>
				)}

				{/* Lista de Resultados dos Leads (apenas nos motores de busca) */}
				{motor !== "CSV" && results.length > 0 ? (
					<Card
						header={
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
								<div>
									<h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
										Resultados Qualificados ({results.length} empresas
										encontradas)
									</h3>
									<p className="text-xs text-slate-400">
										{selectedWithPhone} contatos com telefone verificado prontos
										para CRM
									</p>
								</div>
								<div className="flex items-center gap-2 text-xs">
									<button
										type="button"
										onClick={() => selectAll(true)}
										className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
									>
										Marcar todos
									</button>
									<span className="text-slate-600">|</span>
									<button
										type="button"
										onClick={selectOnlyWithPhone}
										className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
									>
										Apenas com telefone
									</button>
									<span className="text-slate-600">|</span>
									<button
										type="button"
										onClick={() => selectAll(false)}
										className="text-slate-400 hover:text-slate-200 hover:underline cursor-pointer"
									>
										Desmarcar
									</button>
								</div>
							</div>
						}
						footer={
							<div className="flex items-center justify-between w-full">
								<span className="text-xs text-slate-300">
									Selecionados:{" "}
									<strong className="text-white">
										{selectedCount} de {results.length}
									</strong>
								</span>
								<div className="flex items-center gap-3">
									<Link to="/leads">
										<Button variant="ghost" size="sm">
											Cancelar
										</Button>
									</Link>
									<Button
										variant="primary"
										size="sm"
										onClick={handleImport}
										disabled={selectedCount === 0}
										isLoading={isImporting}
									>
										Importar {selectedCount} Leads Selecionados →
									</Button>
								</div>
							</div>
						}
					>
						<div className="divide-y divide-slate-800">
							{results.map((lead) => (
								<div
									key={lead.id}
									className="py-3.5 flex items-start gap-3 hover:bg-slate-800/60 p-2.5 rounded-xl transition-colors cursor-pointer"
									onClick={() => toggleSelect(lead.id)}
									onKeyDown={(e) => e.key === "Enter" && toggleSelect(lead.id)}
									tabIndex={0}
									role="checkbox"
									aria-checked={lead.selected}
								>
									<input
										type="checkbox"
										checked={lead.selected}
										onChange={() => toggleSelect(lead.id)}
										onClick={(e) => e.stopPropagation()}
										className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
									/>

									<div className="flex-1 min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-bold text-sm text-slate-100">
												{lead.nome}
											</span>
											<span
												className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
													lead.motor === "APOLLO"
														? "bg-indigo-950/70 text-indigo-300 border-indigo-800"
														: "bg-emerald-950/70 text-emerald-300 border-emerald-800"
												}`}
											>
												{lead.motor === "APOLLO"
													? "🏢 Apollo B2B"
													: "📍 Google Maps"}
											</span>
											{lead.setor && (
												<span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
													{lead.setor}
												</span>
											)}
											{lead.rating && (
												<span className="text-xs bg-amber-950/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800 font-mono">
													⭐ {lead.rating} ({lead.reviewsCount || 0})
												</span>
											)}
											{lead.porteFuncionarios && (
												<span className="text-xs bg-purple-950/60 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800 font-mono">
													👥 {lead.porteFuncionarios}
												</span>
											)}
										</div>

										{lead.endereco && (
											<p className="text-xs text-slate-400 mt-1 truncate">
												{lead.endereco}
											</p>
										)}

										<div className="flex flex-wrap items-center gap-4 mt-2 text-xs">
											{lead.temTelefone ? (
												<span className="text-emerald-400 font-mono font-semibold flex items-center gap-1.5">
													💬 WhatsApp / Fone: {lead.telefone}
												</span>
											) : (
												<span className="text-amber-400 font-mono">
													⚠ Sem telefone cadastrado
												</span>
											)}

											{lead.dominio && (
												<a
													href={
														lead.dominio.startsWith("http")
															? lead.dominio
															: `https://${lead.dominio}`
													}
													target="_blank"
													rel="noreferrer"
													onClick={(e) => e.stopPropagation()}
													className="text-indigo-400 hover:text-indigo-300 hover:underline text-xs flex items-center gap-1"
												>
													🌐 {lead.dominio} ↗
												</a>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</Card>
				) : motor !== "CSV" ? (
					<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center space-y-3">
						<div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-xl">
							🔍
						</div>
						<h3 className="text-sm font-bold text-slate-100">
							Nenhum lead carregado ainda
						</h3>
						<p className="text-xs text-slate-400 max-w-md mx-auto">
							Configure os filtros acima e clique no botão de busca para minerar
							empresas B2B ou comércios locais em tempo real.
						</p>
					</div>
				) : null}
			</div>
		</AppShell>
	);
}
