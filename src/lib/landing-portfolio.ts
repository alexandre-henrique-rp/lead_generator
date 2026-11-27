export type ProjectCategory = "todos" | "sistemas" | "fintech" | "automacao";

export interface SmallProjectOffer {
	id: string;
	title: string;
	subtitle: string;
	idealFor: string;
	deliveryBadge: string;
	description: string;
	features: string[];
	accent: "indigo" | "emerald" | "pink";
	whatsappSubject: string;
}

export interface PortfolioCase {
	id: string;
	title: string;
	roleBadge: string;
	category: Exclude<ProjectCategory, "todos">;
	categoryLabel: string;
	image: string | null;
	imageAlt: string;
	description: string;
	highlight: string;
	tags: string[];
	liveUrl: string | null;
	liveLabel: string;
	accent: "indigo" | "emerald" | "pink";
}

export interface ContactFormPayload {
	nome: string;
	contato: string;
	tipoProjeto: string;
	mensagem: string;
}

export interface ExpertiseItem {
	name: string;
	category: string;
	detail: string;
	level: number;
	color: "bg-indigo-500" | "bg-emerald-500" | "bg-pink-500";
}

export const KING_DEV_WHATSAPP_NUMBER = "5516996029107";

export const EXPERTISE_ITEMS: ExpertiseItem[] = [
	{
		name: "Node.js & TypeScript (Back-End)",
		category: "Back-End",
		detail:
			"APIs REST escaláveis, webhooks, regras de negócio complexas, ERPs e gateways de pagamento",
		level: 98,
		color: "bg-indigo-500",
	},
	{
		name: "React, TanStack & Tailwind CSS (Front-End)",
		category: "Front-End",
		detail:
			"Interfaces velozes, SSR, dashboards administrativos e páginas de alta conversão",
		level: 98,
		color: "bg-indigo-500",
	},
	{
		name: "Golang (Go) & Alta Performance",
		category: "Sistemas & Concorrência",
		detail:
			"Serviços concorrentes de baixa latência, microsserviços, workers e CLI tools",
		level: 92,
		color: "bg-emerald-500",
	},
	{
		name: "AI Engineering, LLMs & Agentes",
		category: "IA Engineer",
		detail:
			"Engenharia de prompts, agentes autônomos, RAG, OpenAI/Claude e automação no WhatsApp",
		level: 95,
		color: "bg-pink-500",
	},
	{
		name: "DevOps, Linux, Docker & Cloud",
		category: "Infra & DevOps",
		detail:
			"Servidores Linux, containers Docker, pipelines CI/CD, segurança, Nginx e observabilidade",
		level: 94,
		color: "bg-emerald-500",
	},
	{
		name: "PostgreSQL, Prisma & Arquitetura Full-Stack",
		category: "Dados & Arquitetura",
		detail:
			"Modelagem relacional segura, otimização de queries, multi-tenancy e Clean Architecture",
		level: 95,
		color: "bg-indigo-500",
	},
];

export const SMALL_PROJECT_OFFERS: SmallProjectOffer[] = [
	{
		id: "cardapio-digital",
		title: "Cardápio Digital + Pedido no WhatsApp",
		subtitle: "Venda sem taxas de marketplace",
		idealFor: "Restaurantes, pizzarias, hamburguerias e delivery",
		deliveryBadge: "Entrega Rápida",
		description:
			"Catálogo interativo com fotos, adicionais e cálculo automático do pedido que chega pronto e formatado no seu WhatsApp.",
		features: [
			"Catálogo completo com variações e adicionais",
			"Carrinho inteligente com soma automática",
			"Pedido enviado formatado direto no WhatsApp",
		],
		accent: "emerald",
		whatsappSubject: "Cardápio Digital + Pedido no WhatsApp",
	},
	{
		id: "agendamento-online",
		title: "Sistema de Agendamento Online",
		subtitle: "Agenda cheia sem perder tempo no chat",
		idealFor: "Clínicas, barbearias, salões e consultórios",
		deliveryBadge: "Projeto Enxuto",
		description:
			"Seus clientes escolhem o serviço e o horário disponível pelo celular, com confirmação e lembretes automáticos via WhatsApp.",
		features: [
			"Calendário de horários livres em tempo real",
			"Confirmação e lembrete automático no WhatsApp",
			"Painel administrativo para gerir a agenda",
		],
		accent: "indigo",
		whatsappSubject: "Sistema de Agendamento Online",
	},
	{
		id: "landing-page",
		title: "Landing Page & Site de Alta Conversão",
		subtitle: "Presença profissional que transforma visitas em leads",
		idealFor: "Profissionais liberais, clínicas, escritórios e lançamentos",
		deliveryBadge: "Entrega Rápida",
		description:
			"Páginas ultra-rápidas no celular e no desktop, com SEO técnico configurado e foco total em gerar contatos no seu WhatsApp.",
		features: [
			"Carregamento instantâneo e nota máxima de performance",
			"SEO local estruturado + Google Meu Negócio",
			"Design exclusivo sem mensalidade de plataforma",
		],
		accent: "pink",
		whatsappSubject: "Landing Page / Site Institucional",
	},
	{
		id: "catalogo-vitrine",
		title: "Catálogo & Vitrine Online com Orçamento",
		subtitle: "Mostruário digital para fechar vendas rápidas",
		idealFor: "Lojas de roupas, acessórios, decoração e distribuidoras",
		deliveryBadge: "Projeto Enxuto",
		description:
			"Vitrine organizada por categorias e filtros onde o cliente monta a lista de interesse e envia para fechamento imediato com sua equipe.",
		features: [
			"Cadastro simples de produtos, fotos e variações",
			"Sacola de orçamento integrada ao WhatsApp",
			"Painel de controle leve para atualizar itens",
		],
		accent: "indigo",
		whatsappSubject: "Catálogo / Vitrine Online",
	},
	{
		id: "bot-whatsapp",
		title: "Bot de Atendimento & Automação WhatsApp",
		subtitle: "Triagem imediata 24/7 para seu comercial",
		idealFor: "Empresas com alto volume diário de mensagens",
		deliveryBadge: "Automação Comercial",
		description:
			"Responda dúvidas frequentes na hora, qualifique o perfil do cliente e encaminhe apenas oportunidades prontas para o atendimento humano.",
		features: [
			"Integração oficial via WhatsApp Business API",
			"Fluxos de triagem, FAQ e qualificação ou IA",
			"Transbordo organizado para atendimento humano",
		],
		accent: "emerald",
		whatsappSubject: "Bot de Atendimento & Automação WhatsApp",
	},
];

export const PORTFOLIO_CASES: PortfolioCase[] = [
	{
		id: "sisnato",
		title: "SisNato — ERP Digital",
		roleBadge: "Desenvolvedor Chefe",
		category: "sistemas",
		categoryLabel: "ERP & ICP-Brasil",
		image: "/sisnato.png",
		imageAlt: "ERP SisNato - Gestão de Certificação e Assinatura Digital",
		description:
			"Plataforma ERP para imobiliárias e correspondentes Caixa fecharem contratos com assinatura digital ICP-Brasil e conformidade jurídica.",
		highlight: "Emissão ICP-Brasil integrada ao fluxo imobiliário",
		tags: ["Node.js", "React", "ICP-Brasil", "PostgreSQL"],
		liveUrl: "https://sisnato.com.br/",
		liveLabel: "sisnato.com.br",
		accent: "indigo",
	},
	{
		id: "oidoutor",
		title: "Oi Doutor Telemedicina",
		roleBadge: "Desenvolvedor Principal (MVP)",
		category: "sistemas",
		categoryLabel: "HealthTech MVP",
		image: "/oidoutor.png",
		imageAlt: "Oi Doutor Saúde Digital - Plataforma de Telemedicina",
		description:
			"Arquitetura e desenvolvimento do MVP de telemedicina com consultas por vídeo ao vivo, prontuário eletrônico e conformidade LGPD.",
		highlight: "Consultas médicas remotas e prontuário em produção",
		tags: ["React", "WebRTC Vídeo", "Node.js", "LGPD"],
		liveUrl: "https://www.oidoutortelemedicina.com.br/",
		liveLabel: "oidoutortelemedicina.com.br",
		accent: "emerald",
	},
	{
		id: "greeninvest",
		title: "GreenInvest EcoCharge",
		roleBadge: "Especialista Blockchain & Web3",
		category: "fintech",
		categoryLabel: "Fintech & Web3",
		image: "/greeninvest.png",
		imageAlt: "GreenInvest - Fintech e Investimentos Sustentáveis",
		description:
			"Infraestrutura blockchain para fintech de eletropostos com governança on-chain auditável para investidores e liquidação segura.",
		highlight: "Transações on-chain auditáveis em alta performance",
		tags: ["Web3", "Blockchain", "TypeScript", "Fintech"],
		liveUrl: "https://www.greeninvest.com.br/",
		liveLabel: "greeninvest.com.br",
		accent: "indigo",
	},
	{
		id: "agente-ia",
		title: "Agente IA de Vendas & Triagem",
		roleBadge: "Arquitetura & Automação IA",
		category: "automacao",
		categoryLabel: "WhatsApp & IA",
		image: null,
		imageAlt: "Agente IA conectado ao WhatsApp Business API",
		description:
			"Atendimento inteligente conectado ao WhatsApp oficial que qualifica leads comerciais, consulta banco de dados e agenda reuniões sozinho.",
		highlight: "Atendimento imediato 24/7 integrado ao funil comercial",
		tags: ["WhatsApp API", "OpenAI LLM", "Webhooks", "Node.js"],
		liveUrl: null,
		liveLabel: "Solução Customizada",
		accent: "pink",
	},
];

export function filterPortfolioCases(
	cases: PortfolioCase[],
	category: ProjectCategory,
): PortfolioCase[] {
	if (category === "todos") {
		return cases;
	}
	return cases.filter((item) => item.category === category);
}

export function buildProjectWhatsappUrl(
	payload?: Partial<ContactFormPayload>,
): string {
	const nome = payload?.nome?.trim() || "";
	const contato = payload?.contato?.trim() || "";
	const tipoProjeto = payload?.tipoProjeto?.trim() || "";
	const mensagem = payload?.mensagem?.trim() || "";

	if (!nome && !contato && !tipoProjeto && !mensagem) {
		const defaultText =
			"Olá Alexandre! Vi seu portfólio na King Dev Tec e gostaria de conversar sobre um projeto.";
		return `https://wa.me/${KING_DEV_WHATSAPP_NUMBER}?text=${encodeURIComponent(defaultText)}`;
	}

	const lines: string[] = [
		"Olá Alexandre! Vim pelo portfólio da King Dev Tec.",
	];

	if (nome) {
		lines.push(`*Nome:* ${nome}`);
	}
	if (contato) {
		lines.push(`*Empresa/Contato:* ${contato}`);
	}
	if (tipoProjeto) {
		lines.push(`*Interesse:* ${tipoProjeto}`);
	}
	if (mensagem) {
		lines.push(`*Detalhes:* ${mensagem}`);
	}

	return `https://wa.me/${KING_DEV_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}
