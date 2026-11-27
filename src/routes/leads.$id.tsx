import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	useBlocker,
	useNavigate,
} from "@tanstack/react-router";
import { requireUserOrRedirect } from "#/lib/auth-helper";
import {
	Check,
	CheckCircle2,
	Copy,
	Globe,
	Mail,
	MessageCircle,
	Phone,
	RefreshCw,
	Save,
	Search,
	Sparkles,
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
import { getNextEtapa } from "#/componentes/composicao/etapa-funil-pill-track/utils";
import type { StatusType } from "#/componentes/composicao/status_badge";
import EnviarMensagemSection from "#/componentes/orquestracao/enviar-mensagem-section";
import FunilVendasSection from "#/componentes/orquestracao/funil-vendas-section";
import SuperficieAvancadaSection from "#/componentes/orquestracao/superficie-avancada-section";
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

import {
	type OportunidadeTi,
	gerarMensagemServerFn,
	salvarMensagemLeadServerFn,
} from "#/lib/ai-message";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import { renderizarEmailPrimeiraMensagem } from "#/lib/email-template";
import { formatDateBR } from "#/lib/format";
import {
	excluirLeadServerFn,
	getLeadByUuidServerFn,
	updateLeadServerFn,
} from "#/lib/leads";
import { maskCpfCnpj, maskPhone } from "#/lib/masks";
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
	beforeLoad: ({ location }) =>
		requireUserOrRedirect("/login", location.pathname),
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

	const etapasFunilTrack: Array<{ id: EtapaLeadUi; num: number; label: string }> = [
		{ id: "NOVO", num: 1, label: "Novo Lead" },
		{ id: "CONTATADO", num: 2, label: "Contatado" },
		{ id: "QUALIFICADO", num: 3, label: "Qualificado" },
		{ id: "PROPOSTA_ENVIADA", num: 4, label: "Proposta Enviada" },
		{ id: "NEGOCIANDO", num: 5, label: "Em Negociação" },
		{ id: "FECHADO_GANHO", num: 6, label: "Fechado · Ganho" },
	];
	const etapaAtualIdx = etapasFunilTrack.findIndex((e) => e.id === etapa);

	const [copiadoHtmlPronto, setCopiadoHtmlPronto] = useState(false);

	const defaultCorpoEmail = `Olá, Diretoria da ${leadQuery.data?.nome ?? "Empresa"},

Mapeamos 3 oportunidades imediatas para automatizar a entrega de laudos e o agendamento via WhatsApp nas suas unidades em ${cidade || leadQuery.data?.cidade || "Curitiba"}.

Desenvolvemos soluções sob medida em engenharia de software que reduzem em até 65% as filas e ligações na recepção em 30 dias.

Faz sentido conversarmos 15 minutos esta semana para apresentar o diagnóstico?`;

	const [emailAssunto, setEmailAssunto] = useState(
		leadQuery.data?.assuntoEmailIa ||
			`Redução de 65% nas filas de atendimento — ${leadQuery.data?.nome ?? "Empresa"}`,
	);
	const [emailCorpo, setEmailCorpo] = useState(
		leadQuery.data?.canalMensagemIa === "EMAIL" && leadQuery.data?.mensagemIa
			? leadQuery.data.mensagemIa
			: defaultCorpoEmail,
	);
	const [editandoCorpoEmail, setEditandoCorpoEmail] = useState(false);

	const gerarEmailMutation = useMutation({
		mutationFn: async () => {
			return gerarMensagemServerFn({
				data: {
					leadUuid: id,
					canal: "EMAIL",
					mensagemAtual: emailCorpo,
				},
			});
		},
		onSuccess: (resp) => {
			if (resp.assunto) setEmailAssunto(resp.assunto);
			if (resp.mensagem) setEmailCorpo(resp.mensagem);
			setFeedbackMsg("E-mail comercial gerado com sucesso pelo Gemini!");
			setTimeout(() => setFeedbackMsg(""), 4000);
		},
		onError: (e: unknown) => {
			setErrorMsg(
				e instanceof Error ? e.message : "Erro ao gerar e-mail com IA.",
			);
			setTimeout(() => setErrorMsg(""), 6000);
		},
	});

	const salvarTemplateMutation = useMutation({
		mutationFn: async () => {
			const rendered = renderizarEmailPrimeiraMensagem({
				assunto: emailAssunto,
				corpo: emailCorpo,
			});
			return salvarMensagemLeadServerFn({
				data: {
					leadUuid: id,
					canal: "EMAIL",
					mensagem: emailCorpo,
					assunto: emailAssunto,
					templateHtml: rendered.html,
					registrarHistorico: true,
				},
			});
		},
		onSuccess: async () => {
			setFeedbackMsg("Template e e-mail comercial salvos no banco com sucesso!");
			setTimeout(() => setFeedbackMsg(""), 5000);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) }),
				queryClient.invalidateQueries({ queryKey: interacaoKeys.byLead(id) }),
			]);
		},
		onError: (e: unknown) => {
			setErrorMsg(
				e instanceof Error ? e.message : "Erro ao salvar template no banco.",
			);
			setTimeout(() => setErrorMsg(""), 6000);
		},
	});

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
		<AppShell noTopbar noPadding fullWidth>
			{/* Topbar customizada da Ficha 360 idêntica ao Penpot */}
			<div className="border-b border-slate-800/80 bg-[#0b0f19] sticky top-0 z-30 px-6 py-3">
				<div className="flex items-center justify-between gap-4">
					<div>
						{/* Breadcrumb Penpot */}
						<div className="text-[11px] font-mono text-slate-400 mb-0.5">
							3. Orquestração Comercial / Ficha 360º do Lead (/leads/$id)
						</div>

						<div className="flex items-baseline gap-4">
							<h1 className="text-xl font-bold text-white tracking-tight">
								{leadQuery.data.nome}
							</h1>
							<span className="text-xs text-slate-400 font-mono">
								CNPJ {maskCpfCnpj(cnpj || leadQuery.data.cnpj || "08.712.901/0001-19")} ·{" "}
								{cidade || leadQuery.data.cidade || "Curitiba"}/
								{uf || leadQuery.data.uf || "PR"}
							</span>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{isDirty ? (
							<span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#3b2311] border border-amber-600/70 text-amber-300 flex items-center gap-1.5">
								<span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
								● ALTERAÇÕES NÃO SALVAS (⌘S)
							</span>
						) : (
							<span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#062e21] border border-[#0d6e4b] text-[#34d399] flex items-center gap-1.5">
								<span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
								✓ DADOS SINCRONIZADOS
							</span>
						)}
					</div>
				</div>
			</div>

			<div className="p-6 space-y-4 max-w-[1600px] mx-auto">
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

				{/* 1. Sticky Action & Unsaved Blocker Strip (54px) */}
				<div className={`rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border ${
					isDirty
						? "bg-[#111625] border-amber-600/50"
						: "bg-[#111625] border-slate-800/80"
				}`}>
					<div className="flex items-center gap-2 text-xs font-semibold">
						{isDirty ? (
							<span className="text-amber-300">
								● Você possui alterações não salvas no lead. Salve antes de sair desta página.
							</span>
						) : (
							<div className="flex items-center gap-2 text-slate-400 font-medium">
								<span className="text-emerald-400 font-semibold">● Ficha 360º sincronizada</span>
								<span>com o banco de dados · Salve novas alterações com ⌘S</span>
							</div>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setConfirmDelete(true)}
							className="px-4 py-1.5 rounded-lg bg-[#3b1118] border border-[#781928] text-rose-300 text-xs font-semibold hover:bg-[#52131f] transition-colors cursor-pointer"
						>
							Excluir
						</button>

						<button
							type="button"
							onClick={handleConverterEmProjeto}
							className="px-4 py-1.5 rounded-lg bg-[#14192b] border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
						>
							+ Novo Projeto
						</button>

						<Link
							to="/leads/funil"
							className="px-4 py-1.5 rounded-lg bg-[#14192b] border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition-colors"
						>
							Kanban
						</Link>

						<button
							type="button"
							onClick={() =>
								handleSalvar({ preventDefault: () => {} } as React.FormEvent)
							}
							disabled={updateMutation.isPending}
							className="px-4 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-900/30 cursor-pointer"
						>
							{updateMutation.isPending ? "Salvando…" : "Salvar ⌘S"}
						</button>
					</div>
				</div>

				{/* 2. Pipeline Comercial do Lead (EtapaFunilPillTrack) */}
				<div className="bg-[#111625] border border-slate-800/80 rounded-xl p-4 space-y-3">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
						<div>
							<h2 className="text-xs font-bold text-white tracking-wide">
								Pipeline Comercial do Lead (EtapaFunilPillTrack)
							</h2>
							<p className="text-[11px] text-slate-400 mt-0.5">
								Acompanhe o estágio atual, avance com 1 clique ou selecione manualmente qualquer etapa
							</p>
						</div>
						<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[#1c1a3b] border border-indigo-700 text-indigo-300">
							<span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
							ETAPA ATUAL: {etapa.replace(/_/g, " ")}
						</span>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-4 pt-1">
						<div className="flex items-center gap-2 flex-wrap">
							{etapasFunilTrack.map((item, idx) => {
								const isPassada = etapaAtualIdx >= 0 && idx < etapaAtualIdx;
								const isAtual = item.id === etapa;

								if (isAtual) {
									return (
										<button
											key={item.id}
											type="button"
											onClick={() => setEtapa(item.id)}
											className="px-3 py-1 rounded-full text-xs font-semibold bg-[#4f46e5] text-white shadow-sm cursor-pointer"
										>
											{item.num}. {item.label}
										</button>
									);
								}

								if (isPassada) {
									return (
										<button
											key={item.id}
											type="button"
											onClick={() => setEtapa(item.id)}
											className="px-3 py-1 rounded-full text-xs font-medium bg-[#062e21] border border-[#0d6e4b] text-[#34d399] flex items-center gap-1 cursor-pointer"
										>
											✓ {item.num}. {item.label}
										</button>
									);
								}

								return (
									<button
										key={item.id}
										type="button"
										onClick={() => setEtapa(item.id)}
										className="px-3 py-1 rounded-full text-xs font-medium bg-[#14192b] border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
									>
										{item.num}. {item.label}
									</button>
								);
							})}
						</div>

						{proximaEtapa ? (
							<button
								type="button"
								onClick={() => setEtapa(proximaEtapa.value)}
								className="px-4 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-900/30 cursor-pointer whitespace-nowrap"
							>
								Avançar p/ {proximaEtapa.label} →
							</button>
						) : (
							<span className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold">
								✓ Funil Concluído
							</span>
						)}
					</div>
				</div>

				{/* 3. Duas Colunas Principais (Left + Right) - Ficha 360 */}
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
					{/* Coluna Esquerda: Dados Cadastrais + Qualificação IA + Enviar 1ª Mensagem */}
					<div className="space-y-4">
						{/* Left 1: Dados Cadastrais & Enriquecimento CNPJ (BrasilAPI) */}
						<Card
							header={
								<div className="flex items-center justify-between w-full">
									<div>
										<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
											Dados Cadastrais & Enriquecimento CNPJ (BrasilAPI)
										</h3>
										<p className="text-[11px] text-slate-400 font-normal mt-0.5">
											Consulta automática de Razão Social, Endereço, QSA e CNAEs direto na Receita Federal
										</p>
									</div>
									<span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#062e21] border border-[#0d6e4b] text-[#34d399] flex items-center gap-1.5 shrink-0">
										<span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
										BRASILAPI CONECTADA
									</span>
								</div>
							}
						>
							<form onSubmit={handleSalvar} className="space-y-3">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label
											htmlFor="d-nome"
											className="block text-xs font-semibold text-slate-300 uppercase mb-1"
										>
											Nome Fantasia *
										</label>
										<input
											id="d-nome"
											type="text"
											required
											value={nome}
											placeholder="Nome Fantasia da Empresa"
											onChange={(e) => setNome(e.target.value)}
											className="w-full text-xs border border-slate-800 bg-[#0b0f19] rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label
											htmlFor="d-razao"
											className="block text-xs font-semibold text-slate-300 uppercase mb-1"
										>
											Razão Social
										</label>
										<input
											id="d-razao"
											type="text"
											value={razaoSocial}
											placeholder="Razão Social completa"
											onChange={(e) => setRazaoSocial(e.target.value)}
											className="w-full text-xs border border-slate-800 bg-[#0b0f19] rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<div className="flex items-center justify-between mb-1">
											<label
												htmlFor="d-cnpj"
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
										<div className="flex items-center gap-2">
											<input
												id="d-cnpj"
												type="text"
												placeholder="00.000.000/0000-00"
												value={maskCpfCnpj(cnpj)}
												onChange={(e) => {
													setCnpj(e.target.value.replace(/\D/g, ""));
													if (cnpjError) setCnpjError("");
												}}
												className="flex-1 min-w-0 text-xs font-mono border border-slate-800 bg-[#0b0f19] rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
											/>
											<button
												type="button"
												onClick={handleBuscarCnpj}
												disabled={cnpjMutation.isPending}
												className="px-3 py-2 rounded-lg bg-[#14192b] border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
											>
												🔍 Buscar CNPJ
											</button>
										</div>
									</div>

									<div>
										<div className="flex items-center justify-between mb-1">
											<label
												htmlFor="d-email"
												className="block text-xs font-semibold text-slate-300 uppercase"
											>
												E-mail Comercial
											</label>
										</div>
										<input
											id="d-email"
											type="email"
											placeholder="contato@empresa.com.br"
											value={email}
											onChange={(e) => setEmail(e.target.value.toLowerCase())}
											className="w-full text-xs font-mono border border-slate-800 bg-[#0b0f19] rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div>
										<div className="flex items-center justify-between mb-1">
											<label
												htmlFor="d-cel"
												className="block text-xs font-semibold text-slate-300 uppercase"
											>
												Telefone Celular
											</label>
										</div>
										<div className="relative flex items-center">
											<input
												id="d-cel"
												type="text"
												placeholder="(00) 00000-0000"
												value={maskPhone(telefoneCelular)}
												onChange={(e) =>
													setTelefoneCelular(e.target.value.replace(/\D/g, ""))
												}
												className="w-full text-xs font-mono border border-slate-800 bg-[#0b0f19] rounded-lg pl-3 pr-20 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
											/>
											<span className="absolute right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#062e21] border border-[#0d6e4b] text-[#34d399] pointer-events-none">
												WHATSAPP ✓
											</span>
										</div>
									</div>

									<div>
										<div className="flex items-center justify-between mb-1">
											<label
												htmlFor="d-fixo"
												className="block text-xs font-semibold text-slate-300 uppercase"
											>
												Telefone Fixo
											</label>
										</div>
										<input
											id="d-fixo"
											type="text"
											placeholder="(00) 0000-0000"
											value={maskPhone(telefoneFixo)}
											onChange={(e) =>
												setTelefoneFixo(e.target.value.replace(/\D/g, ""))
											}
											className="w-full text-xs font-mono border border-slate-800 bg-[#0b0f19] rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>

									<div>
										<div className="flex items-center justify-between mb-1">
											<label
												htmlFor="d-site"
												className="block text-xs font-semibold text-slate-300 uppercase"
											>
												Website
											</label>
										</div>
										<input
											id="d-site"
											type="text"
											placeholder="https://empresa.com.br"
											value={website}
											onChange={(e) => setWebsite(e.target.value)}
											className="w-full text-xs font-mono border border-slate-800 bg-[#0b0f19] rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div className="sm:col-span-2">
										<label
											htmlFor="d-end"
											className="block text-xs font-semibold text-slate-300 uppercase mb-1"
										>
											Endereço Completo
										</label>
										<input
											id="d-end"
											type="text"
											placeholder="Av. Exemplo, 100 · Bairro"
											value={
												logradouro
													? `${logradouro}${numero ? `, ${numero}` : ""}${bairro ? ` · ${bairro}` : ""}`
													: ""
											}
											onChange={(e) => setLogradouro(e.target.value)}
											className="w-full text-xs border border-slate-800 bg-[#0b0f19] rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label
											htmlFor="d-cid"
											className="block text-xs font-semibold text-slate-300 uppercase mb-1"
										>
											Cidade / UF
										</label>
										<input
											id="d-cid"
											type="text"
											placeholder="Curitiba / PR"
											value={
												cidade
													? `${cidade}${uf ? ` / ${uf}` : ""}`
													: ""
											}
											onChange={(e) => {
												const parts = e.target.value.split("/");
												setCidade(parts[0]?.trim() ?? "");
												setUf(parts[1]?.trim() ?? "");
											}}
											className="w-full text-xs border border-slate-800 bg-[#0b0f19] rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
								</div>
							</form>
						</Card>

						{/* Left 2: Qualificação Comercial & Pesquisa na Web com IA (Gemini Grounded) */}
						<Card
							header={
								<div className="flex items-center justify-between w-full">
									<div>
										<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
											Qualificação Comercial & Pesquisa na Web com IA (Gemini Grounded)
										</h3>
										<p className="text-[11px] text-slate-400 font-normal mt-0.5">
											As observações abaixo orientam a geração da 1ª mensagem e o escopo de projetos
										</p>
									</div>
									<span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1c1a3b] border border-indigo-700 text-indigo-300 shrink-0">
										GEMINI GROUNDED
									</span>
								</div>
							}
						>
							<div className="space-y-3">
								<div className="flex flex-wrap items-center gap-3">
									<button
										type="button"
										onClick={() => pesquisaMutation.mutate()}
										disabled={pesquisaMutation.isPending}
										className="px-3.5 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
									>
										🌐 Pesquisar empresa na web (Gemini + Search)
									</button>
									<span className="text-[11px] text-slate-400 font-mono">
										Consulta site oficial, LinkedIn, notícias e decisores
									</span>
								</div>

								<div className="rounded-lg border border-slate-800 bg-[#0b0f19] p-3 text-xs space-y-2 leading-relaxed">
									{observacoes ? (
										<div className="text-slate-200 whitespace-pre-line leading-relaxed">
											{observacoes}
										</div>
									) : (
										<p className="text-slate-500 italic text-[11px]">
											Nenhuma qualificação ou observação registrada ainda. Clique em "Pesquisar empresa na web" para consultar via Gemini Grounded ou adicione notas.
										</p>
									)}
								</div>
							</div>
						</Card>

						{/* Left 3: Enviar 1ª Mensagem com IA (WhatsApp) */}
						<EnviarMensagemSection
							leadUuid={id}
							leadNome={leadQuery.data.nome}
							telefoneCelular={telefoneCelular || leadQuery.data.telefoneCelular}
							telefoneFixo={telefoneFixo || leadQuery.data.telefoneFixo}
							cidade={cidade || leadQuery.data.cidade}
							uf={uf || leadQuery.data.uf}
							mensagemSalva={leadQuery.data.mensagemIa}
							oportunidadesSalvas={leadQuery.data.oportunidadesIa}
						/>
					</div>

					{/* Coluna Direita: Anotações & Timeline + Variante Canal E-mail */}
					<div className="space-y-4">
						{/* Right 1: Anotações & Histórico de Contatos */}
						<Card
							header={
								<div className="flex items-center justify-between w-full">
									<div>
										<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
											Anotações & Histórico de Contatos
										</h3>
										<p className="text-[11px] text-slate-400 font-normal mt-0.5">
											Registre interações (WhatsApp, Ligação, Reunião ou Nota Interna) em ordem cronológica
										</p>
									</div>
									<span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1c1a3b] border border-indigo-700 text-indigo-300 shrink-0">
										{interacoes.length} {interacoes.length === 1 ? "REGISTRO" : "REGISTROS"}
									</span>
								</div>
							}
						>
							<div className="space-y-3.5">
								{/* Interaction Type Pills + Textarea Composer */}
								<div className="space-y-3">
									<div className="flex flex-wrap items-center gap-2">
										<button
											type="button"
											onClick={() => setNovoTipo("WHATSAPP")}
											className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
												novoTipo === "WHATSAPP"
													? "bg-[#1c1a3b] border border-indigo-600 text-indigo-300"
													: "bg-[#14192b] border border-slate-800 text-slate-400 hover:text-slate-200"
											}`}
										>
											💬 WhatsApp
										</button>
										<button
											type="button"
											onClick={() => setNovoTipo("LIGACAO")}
											className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
												novoTipo === "LIGACAO"
													? "bg-[#0c2340] border border-blue-600 text-blue-300"
													: "bg-[#14192b] border border-slate-800 text-slate-400 hover:text-slate-200"
											}`}
										>
											📞 Ligação
										</button>
										<button
											type="button"
											onClick={() => setNovoTipo("REUNIAO")}
											className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
												novoTipo === "REUNIAO"
													? "bg-[#062e21] border border-emerald-600 text-emerald-300"
													: "bg-[#14192b] border border-slate-800 text-slate-400 hover:text-slate-200"
											}`}
										>
											🤝 Reunião
										</button>
										<button
											type="button"
											onClick={() => setNovoTipo("NOTA")}
											className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
												novoTipo === "NOTA"
													? "bg-slate-800 border border-slate-600 text-slate-200"
													: "bg-[#14192b] border border-slate-800 text-slate-400 hover:text-slate-200"
											}`}
										>
											📝 Nota Interna
										</button>
									</div>

									<textarea
										rows={3}
										value={novaNota}
										onChange={(e) => setNovaNota(e.target.value)}
										placeholder="Registrar resumo da conversa com o lead..."
										className="w-full text-xs border border-slate-800 bg-[#0b0f19] rounded-lg p-3 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>

									<div className="flex justify-end">
										<button
											type="button"
											onClick={handleAddInteracao}
											disabled={criarInteracaoMutation.isPending || !novaNota.trim()}
											className="px-4 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{criarInteracaoMutation.isPending ? "Registrando…" : "+ Registrar Contato"}
										</button>
									</div>
								</div>

								{/* Feed cronológico: apenas interações reais do banco */}
								{interacoes.length > 0 && (
									<div className="space-y-2.5">
										{interacoes.map((item) => {
											const config = {
												REUNIAO: {
													bar: "bg-[#10b981]",
													badge: "bg-[#062e21] border-[#0d6e4b] text-[#34d399]",
													label: "REUNIÃO",
													autor: "por Operador",
												},
												WHATSAPP: {
													bar: "bg-[#6366f1]",
													badge: "bg-[#1c1a3b] border-indigo-700 text-indigo-300",
													label: "WHATSAPP",
													autor: "por Operador",
												},
												LIGACAO: {
													bar: "bg-[#3b82f6]",
													badge: "bg-[#0c2340] border-[#1d4ed8] text-[#60a5fa]",
													label: "LIGAÇÃO",
													autor: "por Operador",
												},
												PESQUISA_IA: {
													bar: "bg-[#06b6d4]",
													badge: "bg-[#083344] border-[#0e7490] text-[#22d3ee]",
													label: "PESQUISA IA",
													autor: "por Gemini 3.5",
												},
												BRASILAPI: {
													bar: "bg-[#f59e0b]",
													badge: "bg-[#382313] border-[#92400e] text-[#fcd34d]",
													label: "BRASILAPI",
													autor: "por Sistema",
												},
												NOTA: {
													bar: "bg-slate-500",
													badge: "bg-slate-800 border-slate-700 text-slate-300",
													label: "NOTA INTERNA",
													autor: "por Operador",
												},
											}[item.tipo] ?? {
												bar: "bg-slate-500",
												badge: "bg-slate-800 border-slate-700 text-slate-300",
												label: item.tipo,
												autor: "por Operador",
											};

											return (
												<div
													key={item.uuid}
													className="relative pl-4 pr-3.5 py-3 rounded-xl border border-slate-800/80 bg-[#0e1424] overflow-hidden"
												>
													<div className={`absolute left-0 top-0 bottom-0 w-1 ${config.bar}`} />
													<div className="flex items-center justify-between text-xs mb-1.5">
														<span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${config.badge}`}>
															{config.label}
														</span>
														<span className="text-slate-400 font-mono text-[11px]">
															{formatDateBR(item.createdAt)} · {config.autor}
														</span>
													</div>
													<p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
														{item.resumo}
													</p>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</Card>

						{/* Right 2: Canal E-mail — Gerador com IA & Template HTML (King Dev) */}
						<Card
							header={
								<div className="flex items-center justify-between w-full">
									<div>
										<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
											Canal E-mail — Gerador com IA & Template HTML (King Dev)
										</h3>
										<p className="text-[11px] text-slate-400 font-normal mt-0.5">
											Geração com IA, personalização de assunto e corpo, prévia institucional e exportação
										</p>
									</div>
									<span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1c1a3b] border border-indigo-700 text-indigo-300 shrink-0">
										CANAL: EMAIL
									</span>
								</div>
							}
						>
							<div className="space-y-4">
								<div>
									<div className="flex items-center justify-between mb-1">
										<label
											htmlFor="em-subj"
											className="block text-xs font-semibold text-slate-300 uppercase"
										>
											Assunto do E-mail
										</label>
										<span className="text-[10px] text-slate-400 font-mono">
											{Math.min(emailAssunto.length, 60)}/60 caracteres
										</span>
									</div>
									<input
										id="em-subj"
										type="text"
										maxLength={60}
										value={emailAssunto}
										onChange={(e) => setEmailAssunto(e.target.value)}
										className="w-full text-xs font-mono border border-slate-800 bg-[#0b0f19] rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
									/>
								</div>

								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label
											htmlFor="em-body"
											className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider"
										>
											CORPO DO E-MAIL (MENSAGEM):
										</label>
										<button
											type="button"
											onClick={() => setEditandoCorpoEmail(!editandoCorpoEmail)}
											className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono cursor-pointer underline"
										>
											{editandoCorpoEmail ? "Fechar editor" : "✏️ Editar texto do e-mail"}
										</button>
									</div>
									{editandoCorpoEmail && (
										<textarea
											id="em-body"
											rows={6}
											value={emailCorpo}
											onChange={(e) => setEmailCorpo(e.target.value)}
											className="w-full text-xs font-sans border border-slate-800 bg-[#0b0f19] rounded-lg p-3 text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed mb-2"
										/>
									)}
								</div>

								<div className="rounded-xl border border-slate-800 bg-white text-slate-900 overflow-hidden shadow-inner">
									<div className="bg-[#0f172a] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
										<span className="text-[11px] font-black tracking-widest text-[#a5b4fc] font-mono">
											KING DEV · ENGENHARIA DE SOFTWARE SOB MEDIDA
										</span>
									</div>

									<div className="p-5 space-y-3 text-xs leading-relaxed">
										<div className="text-slate-800 whitespace-pre-line leading-relaxed font-sans">
											{emailCorpo}
										</div>
										<div className="pt-2">
											<button
												type="button"
												className="inline-block px-4 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
											>
												Agendar Diagnóstico de 15 min →
											</button>
										</div>
										<div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
											King Dev Tecnologia · {cidade || leadQuery.data?.cidade || "Curitiba"}/{uf || leadQuery.data?.uf || "PR"} · CNPJ 58.593.009/0001-00
										</div>
									</div>
								</div>

								<div className="flex flex-wrap items-center gap-2 pt-1">
									<button
										type="button"
										onClick={() => gerarEmailMutation.mutate()}
										disabled={gerarEmailMutation.isPending}
										className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
									>
										<Sparkles className="w-3.5 h-3.5" />
										{gerarEmailMutation.isPending ? "Gerando com IA…" : "Gerar E-mail com IA"}
									</button>

									<button
										type="button"
										onClick={() => {
											const rendered = renderizarEmailPrimeiraMensagem({
												assunto: emailAssunto,
												corpo: emailCorpo,
											});
											navigator.clipboard.writeText(rendered.html);
											setCopiadoHtmlPronto(true);
											setTimeout(() => setCopiadoHtmlPronto(false), 3000);
										}}
										className="px-3.5 py-2 rounded-lg bg-[#1e293b] hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700"
									>
										{copiadoHtmlPronto ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
										{copiadoHtmlPronto ? "HTML Copiado!" : "Copiar HTML Pronto"}
									</button>

									<button
										type="button"
										onClick={() => salvarTemplateMutation.mutate()}
										disabled={salvarTemplateMutation.isPending}
										className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
									>
										<Save className="w-3.5 h-3.5" />
										{salvarTemplateMutation.isPending
											? "Salvando…"
											: "Salvar Template no Banco"}
									</button>

									<button
										type="button"
										onClick={() => {
											setEmailAssunto(`Redução de 65% nas filas de atendimento — ${leadQuery.data?.nome ?? "Empresa"}`);
											setEmailCorpo(defaultCorpoEmail);
										}}
										className="px-3 py-2 rounded-lg bg-[#14192b] border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
									>
										<RefreshCw className="w-3 h-3" />
										↻
									</button>
								</div>

								<p className="text-[11px] text-slate-500 font-mono">
									Destino: {email || leadQuery.data?.email || leadQuery.data?.emails?.[0] || leadQuery.data?.emailCnpj || "—"} · gemini-3.5-flash-lite
								</p>
							</div>
						</Card>
					</div>
				</div>

				{/* 4. Projetos, Orçamento (RN-001/G-03) e Superfície Avançada Receita Federal (QSA) */}
				<div className="space-y-6 pt-2">
					<FunilVendasSection
						leadUuid={id}
						onCriarProjeto={handleConverterEmProjeto}
					/>
					<SuperficieAvancadaSection
						lead={leadQuery.data}
						sociosQuery={sociosQuery}
						historicoCnpjQuery={historicoCnpjQuery}
						cnpjMutation={cnpjMutation}
						onBuscarCnpj={handleBuscarCnpj}
					/>
				</div>
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
