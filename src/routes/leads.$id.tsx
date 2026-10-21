import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useBlocker,
	useNavigate,
} from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowUpRight,
	Check,
	CheckCircle2,
	ChevronDown,
	Coins,
	Copy,
	FileText,
	Globe,
	Hourglass,
	Mail,
	MessageCircle,
	Phone,
	Pin,
	Save,
	Search,
	Smartphone,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	atualizarLeadCnpjServerFn,
	getHistoricoCnpjServerFn,
	getSociosLeadServerFn,
} from "#/api/cnpj";
import {
	criarInteracaoServerFn,
	listarInteracoesServerFn,
	type TipoInteracao,
} from "#/api/interacoes";
import EtapaFunilPillTrack from "#/componentes/composicao/etapa-funil-pill-track";
import { getNextEtapa } from "#/componentes/composicao/etapa-funil-pill-track/utils";
import PerdidoConfirmModal from "#/componentes/composicao/perdido-confirm-modal";
import StatusBadge, {
	type StatusType,
} from "#/componentes/composicao/status_badge";
import EnviarMensagemSection from "#/componentes/orquestracao/enviar-mensagem-section";
import FunilVendasSection from "#/componentes/orquestracao/funil-vendas-section";
import {
	type EmpresaPesquisada,
	pesquisarEmpresaServerFn,
} from "#/lib/research";

type EtapaLeadUi = Extract<
	StatusType,
	| "NOVO"
	| "CONTATADO"
	| "QUALIFICADO"
	| "PROPOSTA_ENVIADA"
	| "NEGOCIANDO"
	| "FECHADO_GANHO"
	| "FECHADO_PERDIDO"
>;

import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import {
	calcularTempoAtividade,
	estimarPorteEFaturamento,
	formatarMoedaBrl,
} from "#/lib/empresa-porte";
import { formatDateBR } from "#/lib/format";
import {
	excluirLeadServerFn,
	getLeadByUuidServerFn,
	updateLeadServerFn,
} from "#/lib/leads";
import { maskCep, maskCpfCnpj, maskPhone } from "#/lib/masks";
import { interacaoKeys, leadKeys, projetoKeys, funilKeys } from "#/lib/query-keys";
import { createProjetoServerFn } from "#/api/projetos";

export type EtapaLeadBanco =
	| "NOVO"
	| "CONTATADO"
	| "DIAGNOSTICO"
	| "QUALIFICADO"
	| "PROPOSTA"
	| "NEGOCIACAO"
	| "GANHO"
	| "PERDIDO";

// Mapeia o enum do banco (PROPOSTA, GANHO) para o enum da UI
// (PROPOSTA_ENVIADA, FECHADO_GANHO). Para futuro: alinhar no schema.
const etapaBancoParaUi: Record<string, EtapaLeadUi> = {
	NOVO: "NOVO",
	CONTATADO: "CONTATADO",
	DIAGNOSTICO: "NOVO",
	QUALIFICADO: "QUALIFICADO",
	PROPOSTA: "PROPOSTA_ENVIADA",
	NEGOCIACAO: "NEGOCIANDO",
	GANHO: "FECHADO_GANHO",
	PERDIDO: "FECHADO_PERDIDO",
};

const etapaUiParaBanco: Record<EtapaLeadUi, EtapaLeadBanco> = {
	NOVO: "NOVO",
	CONTATADO: "CONTATADO",
	QUALIFICADO: "QUALIFICADO",
	PROPOSTA_ENVIADA: "PROPOSTA",
	NEGOCIANDO: "NEGOCIACAO",
	FECHADO_GANHO: "GANHO",
	FECHADO_PERDIDO: "PERDIDO",
};

export const Route = createFileRoute("/leads/$id")({
	beforeLoad: async () => {
		// gate de auth simples — verifica cookie de sessão
		const { getCurrentUserServerFn } = await import("#/api/auth");
		const { user } = await getCurrentUserServerFn();
		if (!user) {
			throw redirect({ to: "/login" });
		}
	},
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData({
			queryKey: leadKeys.detail(params.id),
			queryFn: () => getLeadByUuidServerFn({ data: { uuid: params.id } }),
		});
		return null;
	},
	component: LeadDetailPage,
});

function LeadDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const leadQuery = useQuery({
		queryKey: leadKeys.detail(id),
		queryFn: () => getLeadByUuidServerFn({ data: { uuid: id } }),
	});

	const sociosQuery = useQuery({
		queryKey: ["socios", id],
		queryFn: () => getSociosLeadServerFn({ data: { uuid: id } }),
	});

	const historicoCnpjQuery = useQuery({
		queryKey: ["historicoCnpj", id],
		queryFn: () => getHistoricoCnpjServerFn({ data: { uuid: id } }),
	});

	// Form fields — inicializados vazios, populados via useEffect
	const [nome, setNome] = useState("");
	const [razaoSocial, setRazaoSocial] = useState("");
	const [cnpj, setCnpj] = useState("");
	const [cnpjError, setCnpjError] = useState("");
	const [website, setWebsite] = useState("");
	const [telefoneCelular, setTelefoneCelular] = useState("");
	const [telefoneFixo, setTelefoneFixo] = useState("");
	const [temWhatsapp, setTemWhatsapp] = useState(false);
	const [etapa, setEtapa] = useState<EtapaLeadUi>("NOVO");
	const [observacoes, setObservacoes] = useState("");
	const [cep, setCep] = useState("");
	const [logradouro, setLogradouro] = useState("");
	const [numero, setNumero] = useState("");
	const [complemento, setComplemento] = useState("");
	const [bairro, setBairro] = useState("");
	const [cidade, setCidade] = useState("");
	const [uf, setUf] = useState("");
	const [email, setEmail] = useState("");

	// Ref que identifica a chamada mais recente do CNPJ — respostas
	// com id desatualizado (req anterior) são ignoradas para evitar race
	const cnpjRequestIdRef = useRef(0);

	const cnpjMutation = useMutation({
		mutationFn: () => {
			cnpjRequestIdRef.current += 1;
			const myId = cnpjRequestIdRef.current;
			return atualizarLeadCnpjServerFn({
				data: { uuid: id, cnpj: cnpj.replace(/\D/g, "") },
			}).then((resp) => {
				if (myId !== cnpjRequestIdRef.current) {
					throw new Error("STALE_CNPJ_RESPONSE");
				}
				return resp;
			});
		},
		onSuccess: async (resp) => {
			// 1) Atualizar form IMEDIATAMENTE com a resposta do server (não esperar o refetch)
			if (resp.lead) {
				const l = resp.lead;
				setNome(l.nome);
				setRazaoSocial(l.razaoSocial ?? "");
				setCnpj(l.cnpj ?? "");
				setCep(l.cep ?? "");
				setLogradouro(l.logradouro ?? "");
				setNumero(l.numero ?? "");
				setBairro(l.bairro ?? "");
				setCidade(l.cidade ?? "");
				setUf(l.uf ?? "");
				if (l.website) {
					setWebsite(l.website);
				}
				if (l.email && !email) {
					setEmail(l.email);
				}
				if (l.telefone) {
					const digits = l.telefone.replace(/\D/g, "");
					if (digits.length >= 11) {
						setTelefoneCelular(digits);
					} else if (digits.length === 10) {
						setTelefoneFixo(digits);
					}
				}
			}
			// 2) Forçar refetch de TUDO (lead, socios, histórico)
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) }),
				queryClient.invalidateQueries({ queryKey: ["socios", id] }),
				queryClient.invalidateQueries({ queryKey: ["historicoCnpj", id] }),
			]);
			await queryClient.refetchQueries({ queryKey: leadKeys.detail(id) });
			await queryClient.refetchQueries({ queryKey: ["socios", id] });
			await queryClient.refetchQueries({ queryKey: ["historicoCnpj", id] });
			setCnpjError("");
			setFeedbackMsg(resp.message ?? "Dados do CNPJ atualizados.");
			setTimeout(() => setFeedbackMsg(""), 5000);
		},
		onError: (e: unknown) => {
			if (e instanceof Error && e.message === "STALE_CNPJ_RESPONSE") {
				// Resposta antiga de uma busca anterior — ignora silenciosamente
				return;
			}
			setCnpjError(e instanceof Error ? e.message : "Erro ao consultar CNPJ.");
		},
	});

	function handleBuscarCnpj() {
		const rawCnpj = cnpj.replace(/\D/g, "");
		if (rawCnpj.length !== 14) {
			setCnpjError("CNPJ precisa ter 14 dígitos.");
			return;
		}
		setCnpjError("");
		cnpjMutation.mutate();
	}

	// Popular form a partir do banco
	// Só repopulamos o form quando o LEAD MUDA (uuid diferente).
	// Mudanças no mesmo lead (ex: após save ou "Buscar CNPJ") NÃO
	// resetam o form — o Operador não perde o que está digitando.
	const lastLoadedLeadUuidRef = useRef<string | null>(null);
	useEffect(() => {
		const lead = leadQuery.data;
		if (!lead) return;
		if (lastLoadedLeadUuidRef.current === lead.id) return;
		lastLoadedLeadUuidRef.current = lead.id;

		// Captura os valores novos em locals ANTES dos setX — React state é
		// assíncrono, então as variáveis `nome`, `razaoSocial`, etc. nesta
		// closure ainda têm os valores ANTIGOS (vazios) quando o snapshot é
		// montado. Sem isso, o snapshot fica com "" e a próxima render vê
		// os valores reais do lead → isDirty=true mesmo sem mudança.
		const valores = {
			nome: lead.nome,
			razaoSocial: lead.razaoSocial ?? "",
			cnpj: lead.cnpj ?? "",
			website: lead.website ?? "",
			email: lead.email ?? "",
			telefoneCelular: lead.telefoneCelular ?? "",
			telefoneFixo: lead.telefoneFixo ?? "",
			temWhatsapp: lead.temWhatsapp ?? false,
			etapa: etapaBancoParaUi[lead.etapa] ?? "NOVO",
			observacoes: lead.observacoes ?? "",
			cep: lead.cep ?? "",
			logradouro: lead.logradouro ?? "",
			numero: lead.numero ?? "",
			complemento: lead.complemento ?? "",
			bairro: lead.bairro ?? "",
			cidade: lead.cidade ?? "",
			uf: lead.uf ?? "",
		};

		setNome(valores.nome);
		setRazaoSocial(valores.razaoSocial);
		setCnpj(valores.cnpj);
		setWebsite(valores.website);
		setTelefoneCelular(valores.telefoneCelular);
		setTelefoneFixo(valores.telefoneFixo);
		setTemWhatsapp(valores.temWhatsapp);
		setEtapa(valores.etapa);
		setObservacoes(valores.observacoes);
		setCep(valores.cep);
		setLogradouro(valores.logradouro);
		setNumero(valores.numero);
		setComplemento(valores.complemento);
		setBairro(valores.bairro);
		setCidade(valores.cidade);
		setUf(valores.uf);
		setEmail(valores.email);

		// Snapshot com os MESMOS valores que foram aplicados nos setX
		formSnapshotRef.current = JSON.stringify(valores);
		setIsDirty(false);
	}, [leadQuery.data]);

	const [feedbackMsg, setFeedbackMsg] = useState("");
	const [errorMsg, setErrorMsg] = useState("");

	// Anotações / registros de contato (persistidas — model InteracaoLead)
	const interacoesQuery = useQuery({
		queryKey: interacaoKeys.byLead(id),
		queryFn: () => listarInteracoesServerFn({ data: { leadUuid: id } }),
	});
	const interacoes = interacoesQuery.data ?? [];
	const [novaNota, setNovaNota] = useState("");
	const [novoTipo, setNovoTipo] = useState<TipoInteracao>("WHATSAPP");

	const criarInteracaoMutation = useMutation({
		mutationFn: (input: { tipo: TipoInteracao; resumo: string }) =>
			criarInteracaoServerFn({
				data: { leadUuid: id, tipo: input.tipo, resumo: input.resumo },
			}),
		onSuccess: async () => {
			setNovaNota("");
			await queryClient.invalidateQueries({
				queryKey: interacaoKeys.byLead(id),
			});
		},
		onError: (e: unknown) => {
			setErrorMsg(
				e instanceof Error ? e.message : "Erro ao salvar a anotação.",
			);
			setTimeout(() => setErrorMsg(""), 8000);
		},
	});

	const updateMutation = useMutation({
		mutationFn: () =>
			updateLeadServerFn({
				data: {
					uuid: id,
					nome,
					razaoSocial: razaoSocial || null,
					cnpj: cnpj || null,
					website: website || null,
					telefoneCelular: telefoneCelular || null,
					telefoneFixo: telefoneFixo || null,
					temWhatsapp,
					email: email || null,
					cidade: cidade || null,
					uf: uf || null,
					cep: cep || null,
					logradouro: logradouro || null,
					numero: numero || null,
					bairro: bairro || null,
					complemento: complemento || null,
					etapa: etapaUiParaBanco[etapa],
					observacoes: observacoes || null,
				},
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) });
			await queryClient.invalidateQueries({ queryKey: leadKeys.all });
			// Atualiza snapshot do form para limpar flag de dirty
			formSnapshotRef.current = JSON.stringify({
				nome,
				razaoSocial,
				cnpj,
				website,
				email,
				telefoneCelular,
				telefoneFixo,
				temWhatsapp,
				etapa,
				observacoes,
				cep,
				logradouro,
				numero,
				complemento,
				bairro,
				cidade,
				uf,
			});
			setIsDirty(false);
			setFeedbackMsg("Lead atualizado com sucesso!");
			setTimeout(() => setFeedbackMsg(""), 3000);
		},
		onError: (e: unknown) => {
			setErrorMsg(e instanceof Error ? e.message : "Erro ao salvar o lead.");
			setTimeout(() => setErrorMsg(""), 8000);
		},
	});

	function handleSalvar(e: React.FormEvent) {
		e.preventDefault();
		setFeedbackMsg("");
		updateMutation.mutate();
	}

	const pesquisaMutation = useMutation({
		mutationFn: async () => {
			return pesquisarEmpresaServerFn({ data: { leadUuid: id } });
		},
		onMutate: () => {
			setPesquisaErro("");
			setPesquisaResultado(null);
			setPesquisaOpen(true);
		},
		onSuccess: (resp: EmpresaPesquisada) => {
			setPesquisaResultado(resp);
		},
		onError: (e: unknown) => {
			setPesquisaErro(
				e instanceof Error ? e.message : "Erro ao pesquisar empresa.",
			);
		},
	});

	function handleAplicarPesquisa() {
		if (!pesquisaResultado) return;
		setObservacoes(pesquisaResultado.resumo);

		// Preenche campos VAZIOS apenas — nunca sobrescreve dado existente.
		const preenchidos: string[] = [];

		if (!email && pesquisaResultado.emails.length > 0) {
			setEmail(pesquisaResultado.emails[0].toLowerCase());
			preenchidos.push("email");
		}

		if (!website && pesquisaResultado.site) {
			setWebsite(pesquisaResultado.site);
			preenchidos.push("site");
		}

		// Telefones: fixo (10 dígitos) e celular (11) vão pro campo certo,
		// pulando o que já estiver preenchido.
		let celularAtribuido = telefoneCelular.length > 0;
		let fixoAtribuido = telefoneFixo.length > 0;
		for (const tel of pesquisaResultado.telefones) {
			const digits = tel.replace(/\D/g, "");
			if (digits.length === 11 && !celularAtribuido) {
				setTelefoneCelular(digits);
				celularAtribuido = true;
				preenchidos.push("celular");
			} else if (digits.length === 10 && !fixoAtribuido) {
				setTelefoneFixo(digits);
				fixoAtribuido = true;
				preenchidos.push("telefone fixo");
			}
		}

		// WhatsApp (E.164: 55 + DDD + número) → preenche celular vazio
		// e marca temWhatsapp.
		if (pesquisaResultado.whatsapp) {
			if (!celularAtribuido) {
				const digits = pesquisaResultado.whatsapp.replace(/\D/g, "");
				const local = digits.startsWith("55") ? digits.slice(2) : digits;
				if (local.length >= 10) {
					setTelefoneCelular(local);
					celularAtribuido = true;
					preenchidos.push("celular (WhatsApp)");
				}
			}
			if (!temWhatsapp) {
				setTemWhatsapp(true);
				preenchidos.push("flag WhatsApp");
			}
		}

		setPesquisaOpen(false);

		if (preenchidos.length > 0) {
			setFeedbackMsg(
				`Pesquisa aplicada — campos vazios preenchidos: ${preenchidos.join(", ")}. Revise e salve.`,
			);
			setTimeout(() => setFeedbackMsg(""), 8000);
		}
	}

	// Detecta alterações no form em tempo real — compara estado atual com snapshot
	useEffect(() => {
		if (formSnapshotRef.current === null) return;
		const current = JSON.stringify({
			nome,
			razaoSocial,
			cnpj,
			website,
			email,
			telefoneCelular,
			telefoneFixo,
			temWhatsapp,
			etapa,
			observacoes,
			cep,
			logradouro,
			numero,
			complemento,
			bairro,
			cidade,
			uf,
		});
		setIsDirty(current !== formSnapshotRef.current);
	}, [
		nome,
		razaoSocial,
		cnpj,
		website,
		email,
		telefoneCelular,
		telefoneFixo,
		temWhatsapp,
		etapa,
		observacoes,
		cep,
		logradouro,
		numero,
		complemento,
		bairro,
		cidade,
		uf,
	]);

	const [confirmDelete, setConfirmDelete] = useState(false);
	const [confirmPerdido, setConfirmPerdido] = useState(false);
	const [isDirty, setIsDirty] = useState(false);
	const [pesquisaOpen, setPesquisaOpen] = useState(false);
	const [pesquisaResultado, setPesquisaResultado] =
		useState<EmpresaPesquisada | null>(null);
	const [pesquisaErro, setPesquisaErro] = useState("");
	const [projetoModalOpen, setProjetoModalOpen] = useState(false);
	const [projetoNome, setProjetoNome] = useState("");
	const [projetoDescricao, setProjetoDescricao] = useState("");
	const [projetoErro, setProjetoErro] = useState("");
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "saved" | "dirty"
	>("idle");
	const saveStatusRef = useRef(saveStatus);
	saveStatusRef.current = saveStatus;

	// Snapshot do form no último save/load — usado para detectar alterações
	const formSnapshotRef = useRef<string | null>(null);
	const deleteDialogRef = useRef<HTMLDialogElement>(null);

	// Sincroniza o <dialog> nativo com o state `confirmDelete`
	useEffect(() => {
		const dialog = deleteDialogRef.current;
		if (!dialog) return;
		if (confirmDelete && !dialog.open) {
			dialog.showModal();
		} else if (!confirmDelete && dialog.open) {
			dialog.close();
		}
	}, [confirmDelete]);

	useEffect(() => {
		const dialog = deleteDialogRef.current;
		if (!dialog) return;
		const handleCancel = (e: Event) => {
			e.preventDefault();
			setConfirmDelete(false);
		};
		dialog.addEventListener("cancel", handleCancel);
		return () => dialog.removeEventListener("cancel", handleCancel);
	}, []);

	// Sincroniza o saveStatus com isDirty e o estado da mutation
	useEffect(() => {
		if (updateMutation.isPending) {
			setSaveStatus("saving");
		} else if (isDirty) {
			setSaveStatus("dirty");
		} else if (saveStatusRef.current === "saving") {
			setSaveStatus("saved");
			const t = setTimeout(() => setSaveStatus("idle"), 3000);
			return () => clearTimeout(t);
		}
	}, [isDirty, updateMutation.isPending]);

	// Atalho Cmd/Ctrl+S para salvar
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				if (isDirty && !updateMutation.isPending) {
					updateMutation.mutate();
				}
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isDirty, updateMutation]);

	// Guard de navegação — bloqueia navegação in-app e fechamento da aba
	// quando há alterações não salvas (beforeunload + useBlocker do router)
	useBlocker({
		shouldBlockFn: () => {
			if (!isDirty || updateMutation.isPending) return false;
			return !window.confirm(
				"Alterações não salvas neste lead. Sair mesmo assim?",
			);
		},
		enableBeforeUnload: () => isDirty && !updateMutation.isPending,
	});

	const deleteMutation = useMutation({
		mutationFn: () => excluirLeadServerFn({ data: { uuid: id } }),
		onSuccess: async (resp) => {
			await queryClient.invalidateQueries({ queryKey: leadKeys.all });
			queryClient.removeQueries({ queryKey: leadKeys.detail(id) });
			setFeedbackMsg(`Lead "${resp.nome}" excluído.`);
			navigate({ to: "/leads" });
		},
		onError: (e: unknown) => {
			setConfirmDelete(false);
			setErrorMsg(e instanceof Error ? e.message : "Erro ao excluir o lead.");
			setTimeout(() => setErrorMsg(""), 8000);
		},
	});

	function handleAddInteracao(e: React.FormEvent) {
		e.preventDefault();
		if (!novaNota.trim() || criarInteracaoMutation.isPending) return;
		criarInteracaoMutation.mutate({
			tipo: novoTipo,
			resumo: novaNota.trim(),
		});
	}

	const isQualificadoParaProjeto =
		etapa === "QUALIFICADO" || etapa === "FECHADO_GANHO";

	const criarProjetoMutation = useMutation({
		mutationFn: (input: { nome: string; descricao?: string }) =>
			createProjetoServerFn({
				data: {
					leadUuid: id,
					nome: input.nome,
					descricao: input.descricao,
				},
			}),
		onSuccess: async ({ projeto }) => {
			await queryClient.invalidateQueries({ queryKey: projetoKeys.all });
			await queryClient.invalidateQueries({
				queryKey: funilKeys.byLead(id),
			});
			setProjetoModalOpen(false);
			setProjetoNome("");
			setProjetoDescricao("");
			setProjetoErro("");
			setFeedbackMsg(`Projeto "${projeto.nome}" criado. Siga o funil abaixo.`);
			setTimeout(() => setFeedbackMsg(""), 5000);
		},
		onError: (e: unknown) => {
			setProjetoErro(
				e instanceof Error ? e.message : "Erro ao criar o projeto.",
			);
		},
	});

	function handleConverterEmProjeto() {
		setProjetoErro("");
		setProjetoNome(
			leadQuery.data?.nome ? `Projeto — ${leadQuery.data.nome}` : "",
		);
		setProjetoDescricao("");
		setProjetoModalOpen(true);
	}

	function handleCriarProjeto(e: React.FormEvent) {
		e.preventDefault();
		const nome = projetoNome.trim();
		if (!nome) {
			setProjetoErro("Informe o nome do projeto.");
			return;
		}
		if (criarProjetoMutation.isPending) return;
		criarProjetoMutation.mutate({
			nome,
			descricao: projetoDescricao.trim() || undefined,
		});
	}

	const etapasDisponiveis: { value: EtapaLeadUi; label: string }[] = [
		{ value: "NOVO", label: "Novo Lead" },
		{ value: "CONTATADO", label: "Contatado" },
		{ value: "QUALIFICADO", label: "Qualificado" },
		{ value: "PROPOSTA_ENVIADA", label: "Proposta Enviada" },
		{ value: "NEGOCIANDO", label: "Negociação" },
		{ value: "FECHADO_GANHO", label: "Convertido (Ganho)" },
		{ value: "FECHADO_PERDIDO", label: "Perdido" },
	];

	const proximaEtapa = getNextEtapa(
		etapasDisponiveis,
		etapa,
		"FECHADO_PERDIDO",
	);

	if (leadQuery.isPending) {
		return (
			<AppShell title="Carregando lead…">
				<div className="text-slate-400 text-sm">Carregando dados do banco…</div>
			</AppShell>
		);
	}

	if (leadQuery.isError || !leadQuery.data) {
		return (
			<AppShell title="Lead não encontrado">
				<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
					<p className="text-red-300 mb-4">Lead não encontrado ou inativo.</p>
					<Link to="/leads">
						<Button variant="primary" size="sm">
							← Voltar para Leads
						</Button>
					</Link>
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell
			title={leadQuery.data.nome}
			badge={id}
			actions={
				<div className="flex items-center gap-2">
					<output
						aria-live="polite"
						className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/60"
					>
						{saveStatus === "saving" && (
							<>
								<svg
									className="w-3 h-3 animate-spin text-indigo-400"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8v8H4z"
									/>
								</svg>
								<span className="text-indigo-300 font-medium">Salvando…</span>
							</>
						)}
						{saveStatus === "dirty" && (
							<>
								<span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
								<span className="text-amber-300 font-medium">Não salvo</span>
							</>
						)}
						{saveStatus === "saved" && (
							<>
								<Check className="w-3 h-3 text-emerald-400" />
								<span className="text-emerald-300 font-medium">Salvo</span>
							</>
						)}
						{saveStatus === "idle" && (
							<>
								<Check className="w-3 h-3 text-slate-500" />
								<span className="text-slate-500 font-medium">Salvo</span>
							</>
						)}
					</output>
					<Button
						type="button"
						variant="primary"
						size="sm"
						onClick={() =>
							handleSalvar({ preventDefault: () => {} } as React.FormEvent)
						}
						isLoading={updateMutation.isPending}
						disabled={!isDirty}
						title="Salvar todas as alterações feitas no formulário"
						leftIcon={<Save className="w-3.5 h-3.5" />}
					>
						{updateMutation.isPending ? "Salvando…" : "Salvar"}
					</Button>
					<Link to="/leads">
						<Button variant="outline" size="sm">
							← Voltar
						</Button>
					</Link>
					<Button
						variant="outline"
						size="sm"
						onClick={handleConverterEmProjeto}
						disabled={!isQualificadoParaProjeto}
						title={
							!isQualificadoParaProjeto
								? "Qualifique o lead antes de criar o projeto"
								: undefined
						}
					>
						+ Projeto
					</Button>
					<Button
						type="button"
						variant="danger"
						size="sm"
						onClick={() => setConfirmDelete(true)}
						title="Excluir este lead e seus relacionamentos"
					>
						Excluir
					</Button>
				</div>
			}
		>
			<div className="space-y-6">
				{isDirty && (
					<output
						aria-live="polite"
						className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs font-semibold flex items-center justify-between"
					>
						<span>● Alterações pendentes (Cmd/Ctrl+S para salvar)</span>
						<button
							type="button"
							onClick={() => updateMutation.mutate()}
							disabled={updateMutation.isPending}
							className="text-amber-300 hover:text-amber-100 underline underline-offset-2 cursor-pointer disabled:opacity-50"
						>
							Salvar agora
						</button>
					</output>
				)}
				{feedbackMsg && (
					<div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 flex-shrink-0" />
						<span>{feedbackMsg}</span>
					</div>
				)}
				{errorMsg && (
					<div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2">
						<X className="w-4 h-4 flex-shrink-0" />
						<span>{errorMsg}</span>
					</div>
				)}

				<form
					onSubmit={handleSalvar}
					className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start"
				>
					{/* Coluna 1: Dados Cadastrais */}
					<div className="space-y-6">
						<Card
							header={
								<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
									Dados Cadastrais
								</h3>
							}
						>
							<div className="space-y-3.5">
								<div>
									<label
										htmlFor="lead-nome"
										className="block text-xs font-semibold text-slate-300 uppercase mb-1"
									>
										Nome / Fantasia *
									</label>
									<input
										id="lead-nome"
										type="text"
										required
										value={nome}
										onChange={(e) => setNome(e.target.value)}
										className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label
										htmlFor="lead-razao"
										className="block text-xs font-semibold text-slate-300 uppercase mb-1"
									>
										Razão Social
									</label>
									<input
										id="lead-razao"
										type="text"
										value={razaoSocial}
										onChange={(e) => setRazaoSocial(e.target.value)}
										className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<div className="flex items-center justify-between mb-1">
										<label
											htmlFor="lead-cnpj"
											className="block text-xs font-semibold text-slate-300 uppercase"
										>
											CNPJ
										</label>
										{cnpjError && (
											<span className="text-xs text-rose-400 font-medium">
												{cnpjError}
											</span>
										)}
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<input
											id="lead-cnpj"
											type="text"
											placeholder="00.000.000/0000-00"
											value={maskCpfCnpj(cnpj)}
											onChange={(e) => {
												setCnpj(e.target.value.replace(/\D/g, ""));
												if (cnpjError) setCnpjError("");
											}}
											className="flex-1 min-w-0 text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
										<Button
											type="button"
											variant="outline"
											size="sm"
											isLoading={cnpjMutation.isPending}
											disabled={
												cnpj.replace(/\D/g, "").length !== 14 ||
												cnpjMutation.isPending
											}
											onClick={handleBuscarCnpj}
											title="Consultar dados do CNPJ na BrasilAPI e salvar no banco"
											leftIcon={<Search className="w-3.5 h-3.5" />}
											className="whitespace-nowrap px-3 text-xs border-indigo-700/60 text-indigo-300 hover:bg-indigo-950/60"
										>
											Buscar CNPJ
										</Button>
									</div>
								</div>
								<div>
									<div className="flex items-center justify-between mb-1">
										<label
											htmlFor="lead-website"
											className="block text-xs font-semibold text-slate-300 uppercase"
										>
											Website Oficial
										</label>
										{website && (
											<a
												href={
													website.startsWith("http")
														? website
														: `https://${website}`
												}
												target="_blank"
												rel="noopener noreferrer"
												className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-mono transition-colors"
											>
												<Globe className="w-3 h-3" /> Abrir site
												<ArrowUpRight className="w-3 h-3" />
											</a>
										)}
									</div>
									<input
										id="lead-website"
										type="url"
										placeholder="https://empresa.com.br"
										value={website}
										onChange={(e) => setWebsite(e.target.value)}
										className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<div className="flex items-center justify-between mb-1">
										<label
											htmlFor="lead-email"
											className="block text-xs font-semibold text-slate-300 uppercase"
										>
											E-mail (sempre minúsculo)
										</label>
										{email && (
											<a
												href={`mailto:${email}`}
												className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-mono transition-colors"
											>
												<Mail className="w-3 h-3" /> Abrir cliente de e-mail
											</a>
										)}
									</div>
									<input
										id="lead-email"
										type="email"
										placeholder="contato@empresa.com.br"
										value={email}
										onChange={(e) => setEmail(e.target.value.toLowerCase())}
										className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5">
											<label
												htmlFor="lead-celular"
												className="block text-xs font-semibold text-slate-300 uppercase"
											>
												WhatsApp / Celular
											</label>
											<button
												type="button"
												role="switch"
												aria-checked={temWhatsapp}
												onClick={() => setTemWhatsapp((prev) => !prev)}
												className="flex items-center gap-1.5 cursor-pointer select-none group focus:outline-none"
												title={
													temWhatsapp
														? "WhatsApp ativo (clique para marcar como sem WhatsApp)"
														: "Sem WhatsApp (clique para ativar)"
												}
											>
												<span
													className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
														temWhatsapp
															? "bg-emerald-600"
															: "bg-slate-800 border border-slate-700"
													}`}
												>
													<span
														className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
															temWhatsapp
																? "translate-x-3.5"
																: "translate-x-0.5"
														}`}
													/>
												</span>
												<span
													className={`text-xs font-bold transition-colors ${
														temWhatsapp
															? "text-emerald-400 group-hover:text-emerald-300"
															: "text-slate-500 group-hover:text-slate-400"
													}`}
												>
													{temWhatsapp ? "Com WhatsApp" : "Sem WhatsApp"}
												</span>
											</button>
										</div>
										<input
											id="lead-celular"
											type="text"
											placeholder="(00) 00000-0000"
											value={maskPhone(telefoneCelular)}
											onChange={(e) =>
												setTelefoneCelular(e.target.value.replace(/\D/g, ""))
											}
											className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
										{temWhatsapp && (
											<div className="mt-1 flex items-center justify-between text-xs">
												<span className="text-xs text-emerald-400 font-medium inline-flex items-center gap-1">
													<Smartphone className="w-3 h-3" />
													<span>WhatsApp confirmado</span>
												</span>
												{(telefoneCelular || telefoneFixo).replace(/\D/g, "")
													.length >= 10 && (
													<a
														href={`https://wa.me/55${(telefoneCelular || telefoneFixo).replace(/\D/g, "")}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-xs font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-mono transition-colors"
														title="Abrir conversa no WhatsApp Web"
													>
														<MessageCircle className="w-3 h-3" />
														<span>Abrir conversa</span>
														<ArrowUpRight className="w-3 h-3" />
													</a>
												)}
											</div>
										)}
									</div>
									<div>
										<div className="flex items-center justify-between mb-1.5">
											<label
												htmlFor="lead-fixo"
												className="block text-xs font-semibold text-slate-300 uppercase"
											>
												Telefone Fixo
											</label>
											{(() => {
												const digits = telefoneFixo.replace(/\D/g, "");
												if (digits.length >= 10) {
													return (
														<a
															href={`tel:+55${digits}`}
															title={`Ligar para ${maskPhone(telefoneFixo)}`}
															className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-300 transition-colors font-mono"
														>
															<Phone className="w-3 h-3" />
															<span>Ligar</span>
															<ArrowUpRight className="w-3 h-3" />
														</a>
													);
												}
												return null;
											})()}
										</div>
										<input
											id="lead-fixo"
											type="text"
											placeholder="(00) 0000-0000"
											value={maskPhone(telefoneFixo)}
											onChange={(e) =>
												setTelefoneFixo(e.target.value.replace(/\D/g, ""))
											}
											className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
								</div>
								<div className="pt-2 border-t border-slate-800">
									<span className="block text-xs font-bold text-slate-300 uppercase mb-2">
										Endereço
									</span>
									<div className="space-y-2">
										<div className="grid grid-cols-3 gap-2">
											<input
												type="text"
												placeholder="CEP"
												value={maskCep(cep)}
												onChange={(e) =>
													setCep(e.target.value.replace(/\D/g, ""))
												}
												className="col-span-1 w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200"
											/>
											<input
												type="text"
												placeholder="Cidade/UF"
												value={cidade ? `${cidade}${uf ? `/${uf}` : ""}` : ""}
												onChange={(e) => {
													const parts = e.target.value.split("/");
													setCidade(parts[0] ?? "");
													setUf(parts[1] ?? "");
												}}
												className="col-span-2 w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200"
											/>
										</div>
										<div className="grid grid-cols-4 gap-2">
											<input
												type="text"
												placeholder="Logradouro"
												value={logradouro}
												onChange={(e) => setLogradouro(e.target.value)}
												className="col-span-3 w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200"
											/>
											<input
												type="text"
												placeholder="Nº"
												value={numero}
												onChange={(e) => setNumero(e.target.value)}
												className="col-span-1 w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200"
											/>
										</div>
										<div className="grid grid-cols-2 gap-2">
											<input
												type="text"
												placeholder="Complemento (sala, andar)"
												value={complemento}
												onChange={(e) => setComplemento(e.target.value)}
												className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200"
											/>
											<input
												type="text"
												placeholder="Bairro"
												value={bairro}
												onChange={(e) => setBairro(e.target.value)}
												className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200"
											/>
										</div>
									</div>
								</div>
							</div>
						</Card>
					</div>

					{/* Coluna 2+3: Etapa do Funil + Anotações da sessão (empilhadas) */}
					<div className="space-y-6">
						{/* Coluna 2: Etapa do Funil & Qualificação */}
						<div className="space-y-6">
							<Card
								header={
									<div className="flex items-center justify-between w-full">
										<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
											Etapa do Funil
										</h3>
										<StatusBadge status={etapa} />
									</div>
								}
							>
								<div className="space-y-4">
									<EtapaFunilPillTrack
										etapas={etapasDisponiveis}
										atual={etapa}
										onChange={setEtapa}
										lostValue="FECHADO_PERDIDO"
									/>

									<div className="flex flex-wrap items-center justify-between gap-2">
										<Button
											type="button"
											variant="primary"
											size="sm"
											onClick={() =>
												proximaEtapa && setEtapa(proximaEtapa.value)
											}
											disabled={!proximaEtapa}
										>
											{proximaEtapa
												? `Avançar para ${proximaEtapa.label} →`
												: "Funil finalizado"}
										</Button>

										<details className="text-xs">
											<summary className="cursor-pointer text-slate-400 hover:text-slate-200 list-none select-none">
												Alterar manualmente ▾
											</summary>
											<fieldset className="mt-3 space-y-1 border-0 p-0 m-0">
												<legend className="sr-only">
													Selecionar estágio do funil manualmente
												</legend>
												{etapasDisponiveis.map((item) => (
													<label
														key={item.value}
														className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
															etapa === item.value
																? "bg-indigo-950/60 border-indigo-500 font-semibold text-indigo-300"
																: "border-slate-800 hover:bg-slate-800/40 text-slate-300"
														}`}
													>
														<input
															type="radio"
															name="etapa_lead_manual"
															value={item.value}
															checked={etapa === item.value}
															onChange={() => setEtapa(item.value)}
															className="text-indigo-600 focus:ring-indigo-500"
														/>
														<span>{item.label}</span>
													</label>
												))}
												{etapa === "FECHADO_PERDIDO" && (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => setEtapa("NOVO")}
														className="mt-2 w-full text-indigo-300 hover:bg-indigo-950/40"
													>
														↻ Reabrir lead
													</Button>
												)}
											</fieldset>
										</details>
									</div>

									<div className="pt-2 border-t border-slate-800">
										<label
											htmlFor="lead-observacoes"
											className="block text-xs font-semibold text-slate-300 uppercase mb-1"
										>
											Observações
										</label>
										<textarea
											id="lead-observacoes"
											rows={4}
											value={observacoes}
											onChange={(e) => setObservacoes(e.target.value)}
											placeholder="Ex: Vi que perderam o estagiário do site. Não fale de tráfego pago. Foca só em automação de estoque."
											className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
										/>
										<p className="mt-1 text-[11px] text-slate-500 italic">
											Vale como dado de personalização E como instrução direta
											pra IA ("mencione X", "não fale de Y", "foca em Z").
										</p>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => pesquisaMutation.mutate()}
											isLoading={pesquisaMutation.isPending}
											disabled={pesquisaMutation.isPending}
											leftIcon={<Search className="w-3.5 h-3.5" />}
											className="mt-1.5"
										>
											Pesquisar empresa na web
										</Button>
									</div>

									{etapa !== "FECHADO_PERDIDO" && (
										<div className="pt-2 border-t border-slate-800">
											<p className="text-xs text-slate-500 mb-2">
												Não vai fechar? Marque como perdido.
											</p>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setConfirmPerdido(true)}
												className="w-full border-rose-800/60 text-rose-300 hover:bg-rose-950/30 hover:border-rose-700 hover:text-rose-200"
											>
												Marcar como Perdido
											</Button>
										</div>
									)}
								</div>
							</Card>
						</div>

						<PerdidoConfirmModal
							open={confirmPerdido}
							leadNome={nome}
							isLoading={updateMutation.isPending}
							onClose={() => setConfirmPerdido(false)}
							onConfirm={() => {
								setEtapa("FECHADO_PERDIDO");
								setConfirmPerdido(false);
							}}
						/>

						{/* Coluna 3: Anotações & Contatos (persistidas no banco) */}
						<div className="space-y-6">
							<Card
								header={
									<div className="flex items-center justify-between w-full">
										<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
											Anotações & Contatos
										</h3>
										{interacoes.length > 0 && (
											<span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
												{interacoes.length}
											</span>
										)}
									</div>
								}
							>
								<div className="space-y-4">
									<div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-slate-300 uppercase">
												+ Registrar Contato
											</span>
											<select
												value={novoTipo}
												onChange={(e) =>
													setNovoTipo(e.target.value as TipoInteracao)
												}
												className="text-xs border border-slate-700 rounded px-2 py-0.5 bg-slate-900 text-slate-200 focus:border-indigo-500"
											>
												<option value="WHATSAPP">WhatsApp</option>
												<option value="LIGACAO">Ligação</option>
												<option value="REUNIAO">Reunião</option>
												<option value="NOTA">Nota Interna</option>
											</select>
										</div>
										<textarea
											rows={2}
											placeholder="Resumo do contato…"
											value={novaNota}
											onChange={(e) => setNovaNota(e.target.value)}
											className="w-full text-xs border border-slate-700 rounded-lg p-2 bg-slate-900 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500"
										/>
										<div className="flex justify-end">
											<Button
												type="button"
												variant="primary"
												size="sm"
												onClick={handleAddInteracao}
												disabled={
													!novaNota.trim() || criarInteracaoMutation.isPending
												}
											>
												{criarInteracaoMutation.isPending
													? "Salvando…"
													: "Adicionar Registro"}
											</Button>
										</div>
									</div>
									<div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
										{interacoesQuery.isLoading ? (
											<p className="text-xs text-slate-500 text-center py-4">
												Carregando anotações…
											</p>
										) : interacoes.length === 0 ? (
											<p className="text-xs text-slate-500 text-center py-4">
												Nenhuma anotação ainda. Registre o primeiro contato
												acima.
											</p>
										) : (
											interacoes.map((item) => (
												<div
													key={item.uuid}
													className="p-3 rounded-lg border border-slate-800 bg-slate-950 space-y-1.5"
												>
													<div className="flex items-center justify-between text-xs">
														<span className="font-bold text-slate-100 flex items-center gap-1.5">
															{item.tipo === "WHATSAPP" ? (
																<>
																	<MessageCircle className="w-3 h-3" />
																	<span>WhatsApp</span>
																</>
															) : item.tipo === "LIGACAO" ? (
																<>
																	<Phone className="w-3 h-3" />
																	<span>Ligação</span>
																</>
															) : item.tipo === "REUNIAO" ? (
																<>
																	<FileText className="w-3 h-3" />
																	<span>Reunião</span>
																</>
															) : (
																<>
																	<Pin className="w-3 h-3" />
																	<span>Nota</span>
																</>
															)}
														</span>
														<span className="text-slate-500 font-mono">
															{formatDateBR(item.createdAt, true)}
														</span>
													</div>
													<p className="text-xs text-slate-300 leading-relaxed">
														{item.resumo}
													</p>
												</div>
											))
										)}
									</div>
								</div>
							</Card>
						</div>
					</div>
				</form>

				{/* === Projetos & Funil de Vendas (orçamento → proposta → contrato) === */}
				<FunilVendasSection
					leadUuid={id}
					onCriarProjeto={handleConverterEmProjeto}
				/>

				{/* === Seção Enviar 1ª Mensagem (IA, fora do form por causa do window.open) === */}
				<EnviarMensagemSection
					leadUuid={id}
					leadNome={leadQuery.data.nome}
					telefoneCelular={leadQuery.data.telefoneCelular}
					telefoneFixo={leadQuery.data.telefoneFixo}
					email={
						leadQuery.data.email ??
						leadQuery.data.emails?.[0] ??
						leadQuery.data.emailCnpj
					}
				/>

				{/* === Superfície avançada: RF, QSA e auditoria (disclosure progressivo) === */}
				<details className="group rounded-2xl border border-slate-800 bg-slate-900/40">
					<summary className="cursor-pointer select-none flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider hover:text-slate-100">
						<span>Dados da Receita Federal, QSA e auditoria</span>
						<span className="flex items-center gap-2 font-mono text-slate-500 text-xs normal-case font-normal">
							<span>consulta CNPJ, sócios e log de consultas</span>
							<ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
						</span>
					</summary>
					<div className="px-4 pb-4 pt-4 border-t border-slate-800 space-y-4 lg:space-y-6">
						{/* === Seção Dados da Receita Federal & Inteligência de Qualificação === */}
						{(() => {
							const lead = leadQuery.data;
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

							return (
								<Card
									header={
										<div className="flex flex-wrap items-center justify-between gap-2 w-full">
											<div>
												<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
													Receita Federal & Inteligência de Qualificação
												</h3>
												<p className="text-xs text-slate-500 mt-0.5">
													Última consulta:{" "}
													{lead?.dataUltimaConsultaCnpj
														? formatDateBR(lead.dataUltimaConsultaCnpj, true)
														: "nunca"}
													{lead?.descricaoSituacaoCadastral && (
														<span
															className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
																lead.descricaoSituacaoCadastral === "ATIVA"
																	? "bg-emerald-950/70 text-emerald-300 border border-emerald-700"
																	: "bg-rose-950/70 text-rose-300 border border-rose-700"
															}`}
														>
															● {lead.descricaoSituacaoCadastral}
														</span>
													)}
												</p>
											</div>
											<div className="flex items-center gap-2">
												{lead?.descricaoMatrizFilial && (
													<span className="px-2 py-0.5 rounded text-xs font-mono uppercase bg-slate-900 border border-slate-700 text-slate-300">
														{lead.descricaoMatrizFilial}
													</span>
												)}
												{lead?.porte && (
													<span className="px-2 py-0.5 rounded text-xs font-mono uppercase bg-indigo-950/60 border border-indigo-800 text-indigo-300">
														{lead.porte}
													</span>
												)}
											</div>
										</div>
									}
								>
									{(() => {
										const temDadosCnpj = Boolean(
											lead?.dataUltimaConsultaCnpj ||
												lead?.cnaeFiscal ||
												lead?.naturezaJuridica ||
												lead?.porte ||
												lead?.descricaoSituacaoCadastral ||
												lead?.razaoSocial,
										);

										if (!lead?.cnpj && !temDadosCnpj) {
											return (
												<p className="text-xs text-slate-500 italic text-center py-4">
													Sem CNPJ cadastrado. Adicione um CNPJ no formulário
													acima e clique em "Buscar Dados CNPJ (BrasilAPI)" para
													enriquecer.
												</p>
											);
										}

										if (!temDadosCnpj) {
											return (
												<div className="text-center py-6 space-y-3">
													<p className="text-xs text-slate-400">
														CNPJ{" "}
														<span className="font-mono text-slate-200 font-semibold">
															{maskCpfCnpj(lead.cnpj ?? "")}
														</span>{" "}
														cadastrado, mas os dados da Receita Federal ainda
														não foram consultados.
													</p>
													<Button
														variant="primary"
														size="sm"
														onClick={handleBuscarCnpj}
														disabled={cnpjMutation.isPending}
														leftIcon={<Search className="w-3.5 h-3.5" />}
													>
														{cnpjMutation.isPending
															? "Consultando…"
															: "Consultar Agora na BrasilAPI"}
													</Button>
												</div>
											);
										}

										return (
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

												{/* Grade de Destaque / KPIs Comerciais */}
												{porteInfo && (
													<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
														<div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 space-y-1">
															<div className="flex items-center justify-between text-slate-400 text-xs">
																<span className="font-semibold uppercase tracking-wider">
																	Tamanho & Equipe
																</span>
																<Users className="w-3.5 h-3.5" />
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

														<div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 space-y-1">
															<div className="flex items-center justify-between text-slate-400 text-xs">
																<span className="font-semibold uppercase tracking-wider">
																	Faturamento Presumido
																</span>
																<TrendingUp className="w-3.5 h-3.5" />
															</div>
															<p className="text-sm font-bold text-emerald-300">
																{lead.faturamentoPresumido ||
																	porteInfo.faturamentoPresumido}
															</p>
															<p className="text-xs text-slate-400">
																Estimativa por enquadramento
															</p>
														</div>

														<div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 space-y-1">
															<div className="flex items-center justify-between text-slate-400 text-xs">
																<span className="font-semibold uppercase tracking-wider">
																	Capital Social
																</span>
																<Coins className="w-3.5 h-3.5" />
															</div>
															<p className="text-sm font-bold font-mono text-slate-100">
																{capitalSocialFormatado}
															</p>
															<p className="text-xs text-slate-400">
																Declarado na Receita Federal
															</p>
														</div>

														<div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 space-y-1">
															<div className="flex items-center justify-between text-slate-400 text-xs">
																<span className="font-semibold uppercase tracking-wider">
																	Tempo de Atividade
																</span>
																<Hourglass className="w-3.5 h-3.5" />
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

												{/* Detalhes do Cadastro */}
												<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs pt-2 border-t border-slate-800">
													{lead.nomeFantasia && (
														<div>
															<p className="text-xs text-slate-500 uppercase font-semibold">
																Nome Fantasia
															</p>
															<p className="text-slate-200">
																{lead.nomeFantasia}
															</p>
														</div>
													)}
													{lead.cnpj && (
														<div>
															<p className="text-xs text-slate-500 uppercase font-semibold">
																CNPJ
															</p>
															<p className="font-mono text-slate-200">
																{maskCpfCnpj(lead.cnpj)}
															</p>
														</div>
													)}
													<div>
														<p className="text-xs text-slate-500 uppercase font-semibold">
															Website Oficial
														</p>
														{lead.website ? (
															<a
																href={
																	lead.website.startsWith("http")
																		? lead.website
																		: `https://${lead.website}`
																}
																target="_blank"
																rel="noopener noreferrer"
																className="text-indigo-400 hover:text-indigo-300 font-mono inline-flex items-center gap-1 hover:underline"
															>
																<Globe className="w-3 h-3" />
																{lead.website.replace(/^https?:\/\//, "")}
																<ArrowUpRight className="w-3 h-3" />
															</a>
														) : (
															<p className="text-slate-500 italic">
																Não identificado
															</p>
														)}
													</div>
													{lead.dataSituacaoCadastral && (
														<div>
															<p className="text-xs text-slate-500 uppercase font-semibold">
																Data da Situação
															</p>
															<p className="font-mono text-slate-200">
																{formatDateBR(lead.dataSituacaoCadastral)}
															</p>
														</div>
													)}
													{lead.descricaoMotivoSituacaoCadastral && (
														<div>
															<p className="text-xs text-slate-500 uppercase font-semibold">
																Motivo da Situação
															</p>
															<p className="text-slate-200">
																{lead.motivoSituacaoCadastral != null && (
																	<span className="font-mono text-slate-400 mr-1">
																		[{lead.motivoSituacaoCadastral}]
																	</span>
																)}
																{lead.descricaoMotivoSituacaoCadastral}
															</p>
														</div>
													)}
													{lead.naturezaJuridica && (
														<div className="md:col-span-2">
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
															{lead.opcaoPeloSimples && (
																<Check className="w-3 h-3" />
															)}
															{lead.opcaoPeloSimples
																? "Optante"
																: "Não optante"}
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
															{lead.opcaoPeloMei && (
																<Check className="w-3 h-3" />
															)}
															{lead.opcaoPeloMei ? "Optante" : "Não enquadrado"}
														</p>
													</div>
													{lead.qualificacaoResponsavel && (
														<div>
															<p className="text-xs text-slate-500 uppercase font-semibold">
																Qualificação do Responsável
															</p>
															<p className="text-slate-200">
																{lead.qualificacaoResponsavel}
															</p>
														</div>
													)}
													{lead.enteFederativoResponsavel && (
														<div>
															<p className="text-xs text-slate-500 uppercase font-semibold">
																Ente Federativo
															</p>
															<p className="text-slate-200">
																{lead.enteFederativoResponsavel}
															</p>
														</div>
													)}
													{(lead.nomeCidadeNoExterior || lead.pais) && (
														<div>
															<p className="text-xs text-slate-500 uppercase font-semibold">
																Sede Exterior
															</p>
															<p className="text-slate-200">
																{[lead.nomeCidadeNoExterior, lead.pais]
																	.filter(Boolean)
																	.join(" - ")}
															</p>
														</div>
													)}
													{lead.cnaeFiscalDescricao && (
														<div className="md:col-span-2 lg:col-span-4 p-3 rounded-lg border border-slate-800 bg-slate-950">
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
													{lead.emailCnpj && (
														<div>
															<p className="text-xs text-slate-500 uppercase font-semibold">
																E-mail no Cadastro
															</p>
															<a
																href={`mailto:${lead.emailCnpj}`}
																className="text-slate-200 hover:text-indigo-300 underline font-mono"
															>
																{lead.emailCnpj}
															</a>
														</div>
													)}
													{(lead.dddTelefone1 ||
														lead.dddTelefone2 ||
														lead.dddFax) && (
														<div>
															<p className="text-xs text-slate-500 uppercase font-semibold">
																Telefones no CNPJ
															</p>
															<p className="font-mono text-slate-200">
																{[
																	lead.dddTelefone1,
																	lead.dddTelefone2,
																	lead.dddFax,
																]
																	.filter(Boolean)
																	.join(" / ")}
															</p>
														</div>
													)}
													{(lead.tipoLogradouro || lead.logradouro) && (
														<div className="md:col-span-2">
															<p className="text-xs text-slate-500 uppercase font-semibold">
																Endereço Fiscal Oficial
															</p>
															<p className="text-slate-200">
																{[
																	lead.tipoLogradouro,
																	lead.logradouro,
																	lead.numero,
																	lead.complemento,
																]
																	.filter(Boolean)
																	.join(", ")}
																{lead.bairro && ` — ${lead.bairro}`}
																{lead.municipio &&
																	` (${lead.municipio}/${lead.uf ?? ""})`}
																{lead.codigoMunicipioIbge && (
																	<span className="text-slate-500 text-xs font-mono ml-1">
																		[IBGE: {lead.codigoMunicipioIbge}]
																	</span>
																)}
																{lead.cep && ` · CEP ${maskCep(lead.cep)}`}
															</p>
														</div>
													)}
													{lead.regimeTributario &&
														lead.regimeTributario.length > 0 && (
															<div className="md:col-span-2 lg:col-span-4 p-3 rounded-lg border border-slate-800 bg-slate-950 space-y-1.5">
																<p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
																	Histórico de Regime Tributário (Escriturações)
																</p>
																<div className="flex flex-wrap gap-2 pt-1">
																	{lead.regimeTributario.map((r) => (
																		<span
																			key={r.ano}
																			className="px-2.5 py-1 rounded-md text-xs font-mono border border-slate-800 bg-slate-900 text-slate-300"
																		>
																			<strong className="text-indigo-400">
																				{r.ano}:
																			</strong>{" "}
																			{r.forma_de_tributacao}{" "}
																			<span className="text-slate-500 text-xs">
																				({r.quantidade_de_escrituracoes} escr.)
																			</span>
																		</span>
																	))}
																</div>
															</div>
														)}
													{lead.cnaesSecundarios &&
														lead.cnaesSecundarios.length > 0 && (
															<div className="md:col-span-2 lg:col-span-4 p-3 rounded-lg border border-slate-800 bg-slate-950">
																<p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">
																	CNAEs Secundários (
																	{lead.cnaesSecundarios.length})
																</p>
																<div className="max-h-56 overflow-y-auto space-y-1.5 pr-2">
																	{lead.cnaesSecundarios.map((c) => (
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
												</div>
											</div>
										);
									})()}
								</Card>
							);
						})()}

						{/* === QSA + Histórico lado a lado em xl+ === */}
						<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
							{/* === Quadro Societário (QSA) === */}
							{(() => {
								const listaSocios =
									sociosQuery.data?.socios && sociosQuery.data.socios.length > 0
										? sociosQuery.data.socios
										: (leadQuery.data?.qsa ?? []);

								return (
									<Card
										header={
											<div className="flex items-center justify-between w-full">
												<div>
													<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
														Quadro Societário (QSA)
													</h3>
													<p className="text-xs text-slate-500 mt-0.5">
														Sócios e administradores retornados pela Receita
														Federal
													</p>
												</div>
												<span className="text-xs font-mono text-slate-400">
													{listaSocios.length} sócio(s)
												</span>
											</div>
										}
									>
										{sociosQuery.isPending && listaSocios.length === 0 ? (
											<p className="text-xs text-slate-500 italic text-center py-3">
												Carregando QSA…
											</p>
										) : listaSocios.length === 0 ? (
											<p className="text-xs text-slate-500 italic text-center py-3">
												Nenhum sócio registrado. (Clique em "Buscar Dados CNPJ"
												para consultar na Receita Federal.)
											</p>
										) : (
											<div className="space-y-2.5">
												{listaSocios.map((s, idx) => (
													<div
														key={s.uuid ?? `${s.nomeSocio}-${idx}`}
														className="p-3.5 rounded-lg border border-slate-800 bg-slate-950 space-y-2"
													>
														<div className="flex flex-wrap items-start justify-between gap-3">
															<div>
																<p className="font-bold text-sm text-slate-100">
																	{s.nomeSocio}
																</p>
																<p className="text-xs font-mono text-slate-400 mt-0.5">
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
																<span className="text-xs text-slate-500 font-mono whitespace-nowrap bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
																	Entrada:{" "}
																	{formatDateBR(
																		new Date(
																			s.dataEntradaSociedade,
																		).toISOString(),
																	)}
																</span>
															)}
														</div>
														<div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
															{s.faixaEtaria && (
																<span>Faixa etária: {s.faixaEtaria}</span>
															)}
															{s.pais && <span>País: {s.pais}</span>}
														</div>
														{(s.nomeRepresentanteLegal ||
															s.cpfRepresentanteLegal) && (
															<div className="pt-2 border-t border-slate-900 text-xs text-slate-400">
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
																{s.qualificacaoRepresentanteLegal && (
																	<span className="text-slate-400 ml-1">
																		· {s.qualificacaoRepresentanteLegal}
																	</span>
																)}
															</div>
														)}
													</div>
												))}
											</div>
										)}
									</Card>
								);
							})()}

							{/* === Histórico de Consultas CNPJ (audit) === */}
							<Card
								header={
									<div className="flex items-center justify-between w-full">
										<div>
											<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
												Histórico de Consultas CNPJ
											</h3>
											<p className="text-xs text-slate-500 mt-0.5">
												Log de auditoria — cada clique em "Buscar CNPJ" gera um
												registro
											</p>
										</div>
										<span className="text-xs font-mono text-slate-400">
											{(() => {
												const n =
													historicoCnpjQuery.data?.consultas.length ?? 0;
												return `${n} ${n === 1 ? "consulta" : "consultas"}`;
											})()}
										</span>
									</div>
								}
							>
								{historicoCnpjQuery.isPending ? (
									<p className="text-xs text-slate-500 italic text-center py-3">
										Carregando histórico…
									</p>
								) : !historicoCnpjQuery.data ||
									historicoCnpjQuery.data.consultas.length === 0 ? (
									<p className="text-xs text-slate-500 italic text-center py-3">
										Nenhuma consulta registrada ainda.
									</p>
								) : (
									<div className="space-y-1.5">
										{historicoCnpjQuery.data.consultas.map((c) => {
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
														<span
															className={`font-mono font-bold ${statusClass}`}
														>
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
					</div>
				</details>
			</div>

			{/* Modal de confirmação de exclusão */}
			<dialog
				ref={deleteDialogRef}
				className="bg-transparent p-0 m-0 max-w-md w-full backdrop:bg-black/70"
			>
				<div
					role="alertdialog"
					aria-modal="true"
					aria-labelledby="modal-excluir-lead-title"
					className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-800 text-slate-200 m-4"
				>
					<h3
						id="modal-excluir-lead-title"
						className="text-lg font-bold text-slate-100 mb-1"
					>
						Excluir lead
					</h3>
					<p className="text-sm text-slate-400 mb-4">
						Excluir{" "}
						<strong className="text-slate-200">{leadQuery.data.nome}</strong>{" "}
						permanentemente? Sócios e histórico de consulta CNPJ também serão
						removidos. Projetos vinculados serão preservados (desvinculados do
						lead). Esta ação não pode ser desfeita.
					</p>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setConfirmDelete(false)}
							disabled={deleteMutation.isPending}
							autoFocus
						>
							Cancelar
						</Button>
						<Button
							type="button"
							variant="danger"
							size="sm"
							onClick={() => deleteMutation.mutate()}
							isLoading={deleteMutation.isPending}
						>
							{deleteMutation.isPending
								? "Excluindo…"
								: "Excluir definitivamente"}
						</Button>
					</div>
				</div>
			</dialog>

			{/* Modal de preview da pesquisa na web */}
			{pesquisaOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="pesquisa-titulo"
				>
					<div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-800 text-slate-200 max-h-[85vh] overflow-y-auto">
						<div className="flex items-start justify-between mb-4">
							<h3
								id="pesquisa-titulo"
								className="text-base font-bold text-slate-100"
							>
								<Search className="w-4 h-4 inline mr-1.5 -mt-0.5" />
								Pesquisa na web — {leadQuery.data?.nome}
							</h3>
							<button
								type="button"
								onClick={() => setPesquisaOpen(false)}
								className="text-slate-500 hover:text-slate-200 cursor-pointer"
								aria-label="Fechar"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{pesquisaMutation.isPending && (
							<div className="space-y-3">
								<div className="flex items-center gap-2 text-sm text-slate-300">
									<svg
										className="w-4 h-4 animate-spin text-indigo-400"
										viewBox="0 0 24 24"
										fill="none"
										aria-hidden="true"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8v8H4z"
										/>
									</svg>
									<span>
										Gemini está pesquisando na web sobre essa empresa...
									</span>
								</div>
								<p className="text-xs text-slate-500">
									Isso pode levar 5-15 segundos. A IA consulta site oficial,
									notícias recentes, LinkedIn, Reclame Aqui e mais.
								</p>
							</div>
						)}

						{pesquisaErro && (
							<div className="p-3 rounded-lg border border-rose-800/60 bg-rose-950/40 text-rose-200 text-xs space-y-1">
								<p className="font-semibold">✕ Pesquisa falhou</p>
								<p className="text-rose-300/80 font-mono break-all">
									{pesquisaErro}
								</p>
							</div>
						)}

						{pesquisaResultado && (
							<div className="space-y-4">
								<div>
									<p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
										Resumo
									</p>
									<div className="prose prose-invert prose-sm max-w-none text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
										{pesquisaResultado.resumo}
									</div>
								</div>

								{/* CONTATO (site + telefone + WhatsApp + emails + decisores) */}
								{(pesquisaResultado.site ||
									pesquisaResultado.emails.length > 0 ||
									pesquisaResultado.telefones.length > 0 ||
									pesquisaResultado.whatsapp ||
									pesquisaResultado.decisores.length > 0) && (
									<div className="p-3 rounded-lg border border-indigo-800/40 bg-indigo-950/20 space-y-2">
										<p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
											<Mail className="w-3.5 h-3.5" />
											Contato
										</p>

										{pesquisaResultado.site && (
											<div className="flex items-start gap-1.5 text-xs">
												<Globe className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-500" />
												<a
													href={pesquisaResultado.site}
													target="_blank"
													rel="noopener noreferrer"
													className="text-indigo-300 hover:text-indigo-200 hover:underline break-all"
												>
													{pesquisaResultado.site}
												</a>
											</div>
										)}

										{pesquisaResultado.telefones.length > 0 && (
											<div className="space-y-1">
												{pesquisaResultado.telefones.map((tel) => (
													<div
														key={tel}
														className="flex items-center gap-1.5 text-xs"
													>
														<Phone className="w-3 h-3 flex-shrink-0 text-slate-500" />
														<a
															href={`tel:${tel.replace(/\D/g, "")}`}
															className="text-indigo-300 hover:text-indigo-200 hover:underline"
														>
															{tel}
														</a>
														<button
															type="button"
															title="Copiar telefone"
															onClick={() =>
																navigator.clipboard?.writeText(tel)
															}
															className="text-slate-500 hover:text-slate-300"
														>
															<Copy className="w-3 h-3" />
														</button>
													</div>
												))}
											</div>
										)}

										{pesquisaResultado.whatsapp && (
											<div className="flex items-center gap-1.5 text-xs">
												<MessageCircle className="w-3 h-3 flex-shrink-0 text-emerald-400" />
												<a
													href={`https://wa.me/${pesquisaResultado.whatsapp}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-indigo-300 hover:text-indigo-200 hover:underline"
												>
													{maskPhone(pesquisaResultado.whatsapp.slice(2))}
												</a>
												<button
													type="button"
													title="Copiar WhatsApp"
													onClick={() =>
														navigator.clipboard?.writeText(
															pesquisaResultado.whatsapp ?? "",
														)
													}
													className="text-slate-500 hover:text-slate-300"
												>
													<Copy className="w-3 h-3" />
												</button>
											</div>
										)}

										{pesquisaResultado.emails.length > 0 && (
											<div className="space-y-1">
												{pesquisaResultado.emails.map((email) => (
													<div
														key={email}
														className="flex items-center gap-1.5 text-xs"
													>
														<Mail className="w-3 h-3 flex-shrink-0 text-slate-500" />
														<a
															href={`mailto:${email}`}
															className="text-indigo-300 hover:text-indigo-200 hover:underline break-all"
														>
															{email}
														</a>
													</div>
												))}
											</div>
										)}

										{pesquisaResultado.decisores.length > 0 && (
											<div className="space-y-1">
												{pesquisaResultado.decisores.map((d) => (
													<div
														key={`${d.nome}-${d.cargo ?? ""}`}
														className="flex items-start gap-1.5 text-xs"
													>
														<Users className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-500" />
														<span className="text-slate-200">
															{d.nome}
															{d.cargo && (
																<span className="text-slate-400">
																	{" — "}
																	{d.cargo}
																</span>
															)}
														</span>
													</div>
												))}
											</div>
										)}
									</div>
								)}

								{pesquisaResultado.fontes.length > 0 && (
									<div>
										<p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
											Fontes ({pesquisaResultado.fontes.length})
										</p>
										<ul className="space-y-1">
											{pesquisaResultado.fontes.map((f) => (
												<li
													key={f.uri}
													className="text-xs text-slate-400 flex items-start gap-1.5"
												>
													<Globe className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-500" />
													<a
														href={f.uri}
														target="_blank"
														rel="noopener noreferrer"
														className="text-indigo-300 hover:text-indigo-200 hover:underline break-all"
													>
														{f.titulo}
													</a>
												</li>
											))}
										</ul>
									</div>
								)}

								{pesquisaResultado.queriesUsadas.length > 0 && (
									<details className="text-xs text-slate-500">
										<summary className="cursor-pointer hover:text-slate-300">
											Queries usadas ({pesquisaResultado.queriesUsadas.length})
										</summary>
										<ul className="mt-1 ml-3 space-y-0.5 font-mono text-[10px]">
											{pesquisaResultado.queriesUsadas.map((q) => (
												<li key={q}>• {q}</li>
											))}
										</ul>
									</details>
								)}

								{(pesquisaResultado.tentativas.length > 1 ||
									pesquisaResultado.tentativas.some((t) => t.motivo)) && (
									<details className="text-xs text-slate-500">
										<summary className="cursor-pointer hover:text-slate-300">
											Diagnóstico ({pesquisaResultado.tentativas.length} tiers
											tentados,{" "}
											{pesquisaResultado.tentativas.filter((t) => !t.ok).length}{" "}
											falharam)
										</summary>
										<ul className="mt-1 ml-3 space-y-1">
											{pesquisaResultado.tentativas.map((t) => (
												<li
													key={t.tier}
													className="flex items-start gap-1.5 text-[11px]"
												>
													<span
														className={
															t.ok ? "text-emerald-400" : "text-rose-400"
														}
													>
														{t.ok ? "✓" : "✕"}
													</span>
													<span className="text-slate-400">
														{t.tier === "gemini-grounded"
															? "Tier 1: Gemini + Google Search"
															: t.tier === "places"
																? "Tier 2: Google Places API"
																: "Tier 3: Lead data"}
														{t.motivo && (
															<span
																className={
																	t.ok ? "text-amber-400" : "text-slate-500"
																}
															>
																{" — "}
																{t.motivo}
															</span>
														)}
													</span>
												</li>
											))}
										</ul>
									</details>
								)}

								<p className="text-[10px] text-slate-500 font-mono flex items-center gap-2 flex-wrap">
									<span>
										fonte:{" "}
										<span
											className={
												pesquisaResultado.fonte === "gemini-grounded"
													? "text-emerald-400"
													: pesquisaResultado.fonte === "places"
														? "text-indigo-400"
														: "text-amber-400"
											}
										>
											{pesquisaResultado.fonte === "gemini-grounded"
												? "Gemini + Google Search (IA + web)"
												: pesquisaResultado.fonte === "places"
													? "Google Places API (sem IA)"
													: "Apenas dados do cadastro (sem API)"}
										</span>
									</span>
									<span className="text-slate-600">·</span>
									<span>{pesquisaResultado.modelo}</span>
								</p>
							</div>
						)}

						<div className="mt-5 flex items-center justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setPesquisaOpen(false)}
							>
								Cancelar
							</Button>
							{pesquisaMutation.isError && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => pesquisaMutation.mutate()}
									disabled={pesquisaMutation.isPending}
								>
									Tentar novamente
								</Button>
							)}
							<Button
								type="button"
								variant="primary"
								size="sm"
								onClick={handleAplicarPesquisa}
								disabled={!pesquisaResultado || pesquisaMutation.isPending}
							>
								Aplicar às Observações
							</Button>
						</div>
					</div>
				</div>
			)}

			{projetoModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
					<div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
						<form onSubmit={handleCriarProjeto}>
							<div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
								<div>
									<h3 className="text-sm font-bold text-slate-100">
										Criar projeto para o cliente
									</h3>
									<p className="mt-0.5 text-xs text-slate-400">
										{leadQuery.data?.nome
											? `Vinculado a ${leadQuery.data.nome}`
											: "Novo projeto"}
									</p>
								</div>
								<button
									type="button"
									onClick={() => setProjetoModalOpen(false)}
									className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
									aria-label="Fechar"
								>
									<X className="h-4 w-4" />
								</button>
							</div>

							<div className="space-y-4 px-6 py-5">
								{projetoErro && (
									<div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
										{projetoErro}
									</div>
								)}
								<div>
									<label
										htmlFor="projeto-nome"
										className="mb-1 block text-xs font-semibold text-slate-300"
									>
										Nome do projeto
									</label>
									<input
										id="projeto-nome"
										type="text"
										value={projetoNome}
										onChange={(e) => setProjetoNome(e.target.value)}
										autoFocus
										placeholder="Ex.: Site institucional"
										className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="projeto-descricao"
										className="mb-1 block text-xs font-semibold text-slate-300"
									>
										Descrição{" "}
										<span className="font-normal text-slate-500">
											(opcional)
										</span>
									</label>
									<textarea
										id="projeto-descricao"
										value={projetoDescricao}
										onChange={(e) => setProjetoDescricao(e.target.value)}
										rows={4}
										placeholder="Escopo inicial, observações, etc."
										className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
									/>
								</div>
							</div>

							<div className="flex items-center justify-end gap-2 border-t border-slate-800 px-6 py-4">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setProjetoModalOpen(false)}
									disabled={criarProjetoMutation.isPending}
								>
									Cancelar
								</Button>
								<Button
									type="submit"
									variant="primary"
									size="sm"
									isLoading={criarProjetoMutation.isPending}
									disabled={criarProjetoMutation.isPending}
								>
									{criarProjetoMutation.isPending
										? "Criando…"
										: "Criar projeto"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</AppShell>
	);
}
