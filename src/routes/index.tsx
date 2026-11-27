import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	ArrowUp,
	ArrowUpRight,
	Bot,
	Briefcase,
	CalendarCheck,
	CheckCircle2,
	Clock,
	Code2,
	Cpu,
	Database,
	ExternalLink,
	FileCode2,
	FolderGit2,
	Globe,
	Layers,
	LayoutGrid,
	Mail,
	MapPin,
	Menu,
	MessageSquare,
	PenTool,
	Quote,
	Rocket,
	Search,
	Send,
	ShieldCheck,
	ShoppingBag,
	Sparkles,
	Star,
	Terminal,
	User,
	UtensilsCrossed,
	X,
	Zap,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import {
	buildProjectWhatsappUrl,
	EXPERTISE_ITEMS,
	filterPortfolioCases,
	PORTFOLIO_CASES,
	type ProjectCategory,
	SMALL_PROJECT_OFFERS,
} from "#/lib/landing-portfolio";

const structuredDataJsonLd = JSON.stringify({
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "Person",
			name: "Alexandre Henrique",
			jobTitle:
				"Engenheiro de Software Full-Stack & AI Engineer (Node.js, React, Golang, DevOps, Linux)",
			url: "https://kingdevtec.com",
			knowsAbout: [
				"Node.js",
				"React",
				"Golang",
				"DevOps",
				"Linux",
				"AI Engineering",
				"TypeScript",
				"PostgreSQL",
			],
			sameAs: [
				"https://github.com/alexandre-henrique-rp",
				"https://www.linkedin.com/in/dev-alexandre-henrique",
			],
			worksFor: {
				"@type": "Organization",
				name: "King Dev Tec",
			},
		},
		{
			"@type": "ProfessionalService",
			name: "King Dev Tec — Alexandre Henrique",
			description:
				"Portfólio de engenharia de software, venda de pequenos projetos de entrega rápida (cardápio digital, agendamento online, landing pages, bots WhatsApp) e desenvolvimento de sistemas sob medida e MVPs.",
			areaServed: "BR",
			url: "https://kingdevtec.com",
			email: "contato@kingdevtec.com",
			telephone: "+55-16-99602-9107",
		},
	],
});

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{
				title:
					"Alexandre Henrique · King Dev Tec | Desenvolvedor Independente, Pequenos Projetos & Sistemas Sob Medida",
			},
			{
				name: "description",
				content:
					"Portfólio oficial de Alexandre Henrique (King Dev Tec). Venda de pequenos projetos de entrega rápida (Cardápio Digital, Agendamento, Sites, Bots WhatsApp) e engenharia de sistemas sob medida, SaaS e MVPs.",
			},
			{
				name: "keywords",
				content:
					"desenvolvedor full stack, nodejs, react, golang, devops, linux, ai engineer, engenharia de ia, portfólio desenvolvedor independente, pequenos projetos web, sistemas sob medida, King Dev Tec, Alexandre Henrique",
			},
			{
				property: "og:title",
				content:
					"Alexandre Henrique · King Dev Tec — Portfólio, Pequenos Projetos & Engenharia de Software",
			},
			{
				property: "og:description",
				content:
					"Soluções digitais sob medida: de projetos rápidos para comércios e clínicas a ERPs, fintechs e MVPs escaláveis direto com o desenvolvedor.",
			},
			{
				property: "og:image",
				content: "/alexandre-hero.webp",
			},
		],
	}),
	component: LandingPage,
});

const PROCESS_STEPS = [
	{
		step: "01",
		title: "Diagnóstico",
		description:
			"Entendimento rápido do seu negócio no WhatsApp para definir se a melhor rota é um projeto enxuto ou sistema sob medida.",
		icon: Search,
	},
	{
		step: "02",
		title: "Escopo & Proposta",
		description:
			"Definição clara das entregas, cronograma e proposta comercial transparente — sem letras miúdas ou taxas surpresa.",
		icon: FileCode2,
	},
	{
		step: "03",
		title: "UI & Arquitetura",
		description:
			"Desenho da experiência de uso no celular e no computador junto com a modelagem técnica do banco de dados.",
		icon: PenTool,
	},
	{
		step: "04",
		title: "Desenvolvimento",
		description:
			"Construção direta por mim em ciclos ágeis, com links de prévia para você acompanhar a evolução real.",
		icon: Code2,
	},
	{
		step: "05",
		title: "Testes & Qualidade",
		description:
			"Bateria de testes automatizados e validação em múltiplos dispositivos garantindo segurança e velocidade.",
		icon: ShieldCheck,
	},
	{
		step: "06",
		title: "Deploy & Entrega",
		description:
			"Sistema publicado no ar com domínio configurado, código 100% seu e suporte pós-entrega garantido.",
		icon: Rocket,
	},
];

const TESTIMONIALS = [
	{
		quote:
			"O Alexandre liderou toda a arquitetura do nosso ERP do zero. Hoje conectamos construtoras, correspondentes Caixa e certificadoras no Brasil inteiro com assinatura ICP-Brasil sem falhas de performance.",
		author: "Diretoria de Tecnologia",
		role: "SisNato Digital · ERP & Certificação",
		badge: "ERP em Produção",
	},
	{
		quote:
			"Colocamos a plataforma de telemedicina no ar com muita agilidade. O desenvolvimento do MVP com chamadas de vídeo funcionais foi o que nos permitiu validar a operação rapidamente com os médicos.",
		author: "Coordenação de Produto",
		role: "Oi Doutor Saúde Digital · HealthTech",
		badge: "MVP Validado",
	},
	{
		quote:
			"A senioridade em Web3 e arquitetura de transações on-chain foi um divisor de águas. Sem reuniões desnecessárias, direto ao ponto no código e nas entregas da nossa fintech.",
		author: "Operações & Estruturação",
		role: "GreenInvest Fintech · EcoCharge",
		badge: "Blockchain & Web3",
	},
];

const FAQ_ITEMS = [
	{
		q: "Você atende tanto pequenos projetos rápidos quanto sistemas grandes?",
		a: "Sim! Tenho uma linha dedicada a pequenos projetos de entrega rápida (como cardápios digitais, sistemas de agendamento, catálogos, landing pages e bots de WhatsApp) pensada para comércios, clínicas e profissionais liberais, além da engenharia completa de sistemas sob medida, ERPs e MVPs para startups.",
	},
	{
		q: "Como funciona o orçamento de um projeto?",
		a: "O orçamento é feito sob medida para a sua necessidade real, sem custos inflados de agência. Você me chama no WhatsApp ou preenche o formulário no fim da página, conversamos rapidamente sobre o que você precisa e envio uma proposta clara com escopo e prazo definidos.",
	},
	{
		q: "Quem fica como dono do código-fonte e do sistema?",
		a: "Você. Ao contrário de plataformas alugadas onde você perde tudo se parar de pagar, 100% do código-fonte, banco de dados e domínio ficam no seu nome, sem amarras.",
	},
	{
		q: "Qual a vantagem de contratar um desenvolvedor independente em vez de uma agência?",
		a: "Em agências tradicionais seu investimento custeia vendedores, gerentes intermediários e estrutura física, enquanto o código muitas vezes é repassado para estagiários. Comigo você fala direto com o engenheiro sênior que projeta e programa cada linha do seu sistema.",
	},
	{
		q: "Existe garantia e suporte após a entrega?",
		a: "Com certeza. Todo projeto entregue conta com período de garantia técnica para ajustes e suporte próximo, além da possibilidade de evolução contínua sob demanda conforme seu negócio cresce.",
	},
];

function getOfferIcon(id: string) {
	switch (id) {
		case "cardapio-digital":
			return UtensilsCrossed;
		case "agendamento-online":
			return CalendarCheck;
		case "landing-page":
			return Globe;
		case "catalogo-vitrine":
			return ShoppingBag;
		case "bot-whatsapp":
			return Bot;
		default:
			return Sparkles;
	}
}

function LandingPage() {
	const [openFaq, setOpenFaq] = useState<number | null>(0);
	const [activeCategory, setActiveCategory] =
		useState<ProjectCategory>("todos");
	const [activeTestimonial, setActiveTestimonial] = useState<number>(0);
	const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

	// Estado do formulário interativo de contato/orçamento
	const [nome, setNome] = useState("");
	const [contato, setContato] = useState("");
	const [tipoProjeto, setTipoProjeto] = useState(
		"Pequeno Projeto: Cardápio / Agendamento / Site / Catálogo",
	);
	const [mensagem, setMensagem] = useState("");

	const toggleFaq = (index: number) => {
		setOpenFaq(openFaq === index ? null : index);
	};

	const whatsappUrl = buildProjectWhatsappUrl();
	const filteredCases = filterPortfolioCases(PORTFOLIO_CASES, activeCategory);

	const handleSelectProjectForQuote = (subject: string) => {
		setTipoProjeto(subject);
		const contactSection = document.getElementById("contato");
		if (contactSection) {
			contactSection.scrollIntoView({ behavior: "smooth" });
		}
	};

	const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const targetUrl = buildProjectWhatsappUrl({
			nome,
			contato,
			tipoProjeto,
			mensagem,
		});
		window.open(targetUrl, "_blank", "noopener,noreferrer");
	};

	const currentTestimonial = TESTIMONIALS[activeTestimonial] ?? TESTIMONIALS[0];

	return (
		<div
			id="topo"
			className="min-h-screen bg-black text-slate-200 font-sans selection:bg-indigo-500/30 relative overflow-x-hidden"
		>
			{/* Dados estruturados SEO JSON-LD */}
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD estático de SEO
				dangerouslySetInnerHTML={{ __html: structuredDataJsonLd }}
			/>

			{/* Tech Grid Background */}
			<div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#4f46e50f_1px,transparent_1px),linear-gradient(to_bottom,#4f46e50f_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,#000_70%,transparent_100%)] fixed pointer-events-none" />

			{/* Ambient Lighting */}
			<div className="absolute top-0 left-1/4 w-[680px] h-[420px] bg-indigo-600/15 blur-[150px] rounded-full pointer-events-none z-0" />
			<div className="absolute top-28 right-1/4 w-[520px] h-[520px] bg-pink-600/10 blur-[150px] rounded-full pointer-events-none z-0" />
			<div className="absolute top-2/3 left-0 w-[500px] h-[500px] bg-indigo-900/15 blur-[160px] rounded-full pointer-events-none z-0" />

			{/* Floating WhatsApp Button */}
			<div className="fixed bottom-6 right-6 z-50 flex items-center group">
				<a
					href={whatsappUrl}
					target="_blank"
					rel="noreferrer"
					aria-label="Falar com Alexandre no WhatsApp"
					className="relative flex items-center justify-center w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full shadow-[0_10px_25px_rgba(16,185,129,0.5)] transition-transform hover:scale-105 active:scale-95"
				>
					<span className="absolute -top-1 -right-1 flex h-4 w-4">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
						<span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400" />
					</span>
					<MessageSquare className="w-6 h-6 fill-current" />
				</a>
				<div className="hidden group-hover:block absolute right-16 bg-slate-900 border border-emerald-500/30 text-slate-200 text-xs font-medium px-3.5 py-2 rounded-lg whitespace-nowrap shadow-xl">
					Falar com Alexandre no WhatsApp (Online)
				</div>
			</div>

			{/* Navigation */}
			<header className="sticky top-0 z-30 border-b border-slate-800/80 bg-black/85 backdrop-blur-xl">
				<nav
					aria-label="Navegação principal"
					className="flex items-center justify-between px-6 md:px-8 h-20 max-w-7xl mx-auto gap-4"
				>
					<Link
						to="/"
						className="flex items-center shrink-0 transition-opacity hover:opacity-90"
					>
						<img
							src="/Logo_KingDevTec_04.png"
							alt="King Dev Tec"
							width={150}
							height={38}
							className="h-8 md:h-9 w-auto object-contain"
						/>
					</Link>

					{/* Links centralizados com indicador luminoso igual à referência */}
					<div className="hidden lg:flex items-center gap-1 rounded-full border border-slate-800/90 bg-slate-950/90 px-3 py-1.5 shadow-lg">
						{[
							{ href: "#topo", label: "Início", active: true },
							{ href: "#sobre", label: "Sobre & Stack", active: false },
							{
								href: "#pequenos-projetos",
								label: "Pequenos Projetos",
								active: false,
							},
							{ href: "#portfolio", label: "Portfólio", active: false },
							{ href: "#solucoes", label: "Sistemas & MVPs", active: false },
							{ href: "#processo", label: "Processo", active: false },
							{ href: "#contato", label: "Contato", active: false },
						].map((link) => (
							<a
								key={link.href}
								href={link.href}
								className={`relative px-3.5 py-1.5 text-xs xl:text-sm font-medium rounded-full transition-colors ${
									link.active
										? "text-white bg-indigo-600/20 border border-indigo-500/40 shadow-[0_0_15px_rgba(79,70,229,0.25)]"
										: "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
								}`}
							>
								{link.label}
							</a>
						))}
					</div>

					{/* Ações à Direita + Botão Mobile */}
					<div className="flex items-center gap-2.5 shrink-0">
						<a
							href="#contato"
							className="text-xs md:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-xl shadow-[0_0_20px_-4px_rgba(79,70,229,0.65)] transition-all flex items-center gap-2"
						>
							<Sparkles className="w-4 h-4 text-indigo-200" />
							<span>Solicitar Orçamento</span>
						</a>
						<Link
							to="/login"
							aria-label="Central Administrativa"
							className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-indigo-500/40 transition-colors"
						>
							<Terminal className="w-3.5 h-3.5 text-indigo-400" />
							<span>Admin</span>
						</Link>
						<button
							type="button"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							aria-label={
								mobileMenuOpen
									? "Fechar menu de navegação"
									: "Abrir menu de navegação"
							}
							aria-expanded={mobileMenuOpen}
							className="lg:hidden w-10 h-10 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-200 hover:border-indigo-500/40 flex items-center justify-center transition-colors cursor-pointer"
						>
							{mobileMenuOpen ? (
								<X className="w-5 h-5" />
							) : (
								<Menu className="w-5 h-5" />
							)}
						</button>
					</div>
				</nav>

				{/* Menu Mobile Dropdown */}
				{mobileMenuOpen && (
					<div className="lg:hidden border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl px-6 py-4 space-y-1">
						{[
							{ href: "#topo", label: "Início" },
							{ href: "#sobre", label: "Sobre & Stack" },
							{ href: "#pequenos-projetos", label: "Pequenos Projetos" },
							{ href: "#portfolio", label: "Portfólio" },
							{ href: "#solucoes", label: "Sistemas & MVPs" },
							{ href: "#processo", label: "Processo" },
							{ href: "#contato", label: "Contato" },
						].map((link) => (
							<a
								key={link.href}
								href={link.href}
								className="block px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
							>
								{link.label}
							</a>
						))}
						<div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between">
							<Link
								to="/login"
								className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-slate-200 py-2"
							>
								<Terminal className="w-3.5 h-3.5 text-indigo-400" />
								<span>Acessar Central Administrativa</span>
							</Link>
						</div>
					</div>
				)}
			</header>

			<main className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 space-y-12 pb-24">
				{/* Hero Section */}
				<section aria-labelledby="hero-heading" className="pt-10 md:pt-16 pb-6">
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
						{/* Coluna Esquerda: Posicionamento, CTAs e Redes */}
						<div className="lg:col-span-6 flex flex-col items-start text-left">
							<div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 mb-6 rounded-full border border-indigo-500/30 bg-slate-900/90 text-xs font-mono text-slate-300 shadow-sm">
								<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
								<span>
									Desenvolvedor Independente · Pequenos Projetos & Sistemas
								</span>
							</div>

							<h1
								id="hero-heading"
								className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-slate-100 leading-[1.08] mb-6"
							>
								Eu construo{" "}
								<span className="block text-indigo-400">soluções digitais</span>{" "}
								que vendem e escalam.
							</h1>

							<p className="text-base sm:text-lg text-slate-300 max-w-xl mb-8 leading-relaxed">
								Sou{" "}
								<strong className="text-slate-100 font-semibold">
									Alexandre Henrique
								</strong>
								, engenheiro de software full-stack à frente da{" "}
								<strong className="text-slate-100 font-semibold">
									King Dev Tec
								</strong>
								. Desenvolvo desde pequenos projetos comerciais de entrega
								rápida até plataformas SaaS, ERPs e MVPs completos — direto com
								quem escreve o código.
							</p>

							<div className="flex flex-wrap items-center gap-4 mb-8 w-full sm:w-auto">
								<a
									href="#pequenos-projetos"
									className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2.5 text-sm"
								>
									<span>Ver Projetos & Soluções</span>
									<ArrowRight className="w-4 h-4" />
								</a>

								<a
									href={whatsappUrl}
									target="_blank"
									rel="noreferrer"
									className="w-full sm:w-auto px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2.5 text-sm"
								>
									<span>Vamos Conversar</span>
									<MessageSquare className="w-4 h-4 text-indigo-400" />
								</a>
							</div>

							{/* Botões sociais quadrados inspirados na referência */}
							<div className="flex items-center gap-3">
								<a
									href="https://github.com/alexandre-henrique-rp"
									target="_blank"
									rel="noreferrer"
									aria-label="GitHub de Alexandre Henrique"
									className="w-10 h-10 rounded-lg border border-slate-800 bg-slate-900/80 hover:border-indigo-500/50 hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-slate-100 transition-colors"
								>
									<span className="sr-only">GitHub de Alexandre Henrique</span>
									<svg
										className="w-4 h-4 fill-current"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
											clipRule="evenodd"
										/>
									</svg>
								</a>
								<a
									href="https://www.linkedin.com/in/dev-alexandre-henrique"
									target="_blank"
									rel="noreferrer"
									aria-label="LinkedIn de Alexandre Henrique"
									className="w-10 h-10 rounded-lg border border-slate-800 bg-slate-900/80 hover:border-indigo-500/50 hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-slate-100 transition-colors"
								>
									<span className="sr-only">
										LinkedIn de Alexandre Henrique
									</span>
									<svg
										className="w-4 h-4 fill-current"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
											clipRule="evenodd"
										/>
									</svg>
								</a>
								<a
									href={whatsappUrl}
									target="_blank"
									rel="noreferrer"
									aria-label="Chamar no WhatsApp"
									className="w-10 h-10 rounded-lg border border-slate-800 bg-slate-900/80 hover:border-emerald-500/50 hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-emerald-400 transition-colors"
								>
									<MessageSquare className="w-4 h-4" />
								</a>
								<a
									href="mailto:contato@kingdevtec.com"
									aria-label="Enviar e-mail para contato@kingdevtec.com"
									className="w-10 h-10 rounded-lg border border-slate-800 bg-slate-900/80 hover:border-pink-500/50 hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-pink-400 transition-colors"
								>
									<Mail className="w-4 h-4" />
								</a>
							</div>
						</div>

						{/* Coluna Direita: Foto com Halo Luminoso + Card de Código + 3 Métricas Flutuantes */}
						<div className="lg:col-span-6 relative flex items-center justify-center min-h-[460px] sm:min-h-[540px]">
							{/* Halo circular luminoso inspirado na referência nas cores King Dev Tec */}
							<div className="absolute w-[310px] h-[310px] sm:w-[410px] sm:h-[410px] rounded-full bg-indigo-950/50 border border-indigo-500/30 shadow-[0_0_90px_rgba(79,70,229,0.35)] pointer-events-none" />
							<div className="absolute w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] rounded-full border border-pink-500/15 pointer-events-none" />

							{/* Imagem principal do Alexandre com prioridade máxima de LCP */}
							<div className="relative z-10 flex flex-col items-center">
								<img
									src="/alexandre-hero.webp"
									alt="Alexandre Henrique — Desenvolvedor Full-Stack e Fundador da King Dev Tec"
									width={620}
									height={868}
									fetchPriority="high"
									className="w-[270px] sm:w-[340px] md:w-[370px] h-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] select-none"
								/>

								{/* Card flutuante na base do retrato: Clean Code / Soluções Escaláveis */}
								<div className="-mt-12 relative z-20 w-[290px] sm:w-[330px] rounded-xl border border-indigo-500/40 bg-slate-950/95 backdrop-blur-md px-5 py-4 shadow-xl flex items-center gap-4">
									<div className="w-11 h-11 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 font-mono font-bold text-lg">
										{"</>"}
									</div>
									<div className="text-xs sm:text-sm space-y-1 text-slate-200 font-medium">
										<div className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
											<span>Código Limpo & 100% Seu</span>
										</div>
										<div className="flex items-center gap-2 text-slate-300">
											<span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
											<span>Pequenos Projetos & MVPs</span>
										</div>
										<div className="flex items-center gap-2 text-slate-400">
											<span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
											<span>Sem Burocracia de Agência</span>
										</div>
									</div>
								</div>
							</div>

							{/* 3 Cards de Indicadores Empilhados à Direita (Desktop/Tablet) */}
							<div className="hidden sm:flex flex-col gap-3.5 absolute right-0 top-6 z-20 w-44">
								<div className="rounded-xl border border-slate-800 bg-slate-950/90 backdrop-blur-md p-4 shadow-lg hover:border-indigo-500/50 transition-colors">
									<div className="flex items-center justify-between mb-1">
										<span className="text-2xl font-extrabold text-slate-100 tabular-nums">
											8+
										</span>
										<Briefcase className="w-4 h-4 text-indigo-400" />
									</div>
									<p className="text-xs text-slate-400 leading-snug">
										Sistemas & MVPs em Produção
									</p>
								</div>

								<div className="rounded-xl border border-slate-800 bg-slate-950/90 backdrop-blur-md p-4 shadow-lg hover:border-pink-500/50 transition-colors">
									<div className="flex items-center justify-between mb-1">
										<span className="text-2xl font-extrabold text-slate-100 tabular-nums">
											5
										</span>
										<Layers className="w-4 h-4 text-pink-400" />
									</div>
									<p className="text-xs text-slate-400 leading-snug">
										Linhas de Pequenos Projetos Rápidos
									</p>
								</div>

								<div className="rounded-xl border border-slate-800 bg-slate-950/90 backdrop-blur-md p-4 shadow-lg hover:border-emerald-500/50 transition-colors">
									<div className="flex items-center justify-between mb-1">
										<span className="text-2xl font-extrabold text-emerald-400 tabular-nums">
											100%
										</span>
										<Star className="w-4 h-4 text-emerald-400" />
									</div>
									<p className="text-xs text-slate-400 leading-snug">
										Compromisso & Código Proprietário
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Bento Duplo: Sobre Mim + Especialidades & Stack (Inspirado em About Me / My Expertise) */}
				<section
					id="sobre"
					aria-labelledby="sobre-heading"
					className="grid grid-cols-1 lg:grid-cols-12 gap-6"
				>
					{/* Card Esquerdo: Sobre Alexandre Henrique */}
					<article className="lg:col-span-5 rounded-2xl border border-slate-800/90 bg-slate-950/80 p-7 md:p-8 shadow-lg flex flex-col justify-between">
						<div>
							<h2
								id="sobre-heading"
								className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2.5 mb-5"
							>
								<User className="w-5 h-5 text-indigo-400 shrink-0" />
								<span>Sobre Alexandre Henrique</span>
							</h2>

							<p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
								Sou engenheiro de software full-stack com foco em construir
								ferramentas que resolvem problemas reais de faturamento,
								atendimento e operação. Liderei o desenvolvimento de ERPs com
								certificação ICP-Brasil, plataformas de telemedicina e fintechs
								em blockchain.
							</p>
							<p className="text-slate-400 text-sm leading-relaxed mb-6">
								Na <strong className="text-slate-200">King Dev Tec</strong>,
								atuo em duas frentes claras: entrego{" "}
								<strong className="text-slate-200">
									pequenos projetos rápidos
								</strong>{" "}
								para negócios locais venderem mais todos os dias e construo{" "}
								<strong className="text-slate-200">
									sistemas sob medida e MVPs
								</strong>{" "}
								para empresas e startups.
							</p>

							{/* Grid 2x2 de Informações Rápidas (estilo referência) */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80 mb-6">
								<div className="flex items-start gap-3">
									<div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
										<User className="w-4 h-4" />
									</div>
									<div>
										<div className="text-xs text-slate-400">Engenheiro</div>
										<div className="text-sm font-semibold text-slate-200">
											Alexandre Henrique
										</div>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
										<MapPin className="w-4 h-4" />
									</div>
									<div>
										<div className="text-xs text-slate-400">Localização</div>
										<div className="text-sm font-semibold text-slate-200">
											SP · Atendimento Nacional
										</div>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
										<Mail className="w-4 h-4" />
									</div>
									<div>
										<div className="text-xs text-slate-400">E-mail Direto</div>
										<div className="text-sm font-semibold text-slate-200 break-all">
											contato@kingdevtec.com
										</div>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
										<Clock className="w-4 h-4" />
									</div>
									<div>
										<div className="text-xs text-slate-400">
											Disponibilidade
										</div>
										<div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
											<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
											<span>Agenda Aberta</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							<a
								href={whatsappUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 text-xs sm:text-sm font-semibold text-slate-200 transition-colors"
							>
								<span>Conversar diretamente comigo</span>
								<ArrowRight className="w-4 h-4 text-indigo-400" />
							</a>
						</div>
					</article>

					{/* Card Direito: Especialidades & Stack de Engenharia */}
					<article className="lg:col-span-7 rounded-2xl border border-slate-800/90 bg-slate-950/80 p-7 md:p-8 shadow-lg flex flex-col justify-between">
						<div>
							<div className="flex flex-wrap items-center justify-between gap-3 mb-6">
								<h2 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2.5">
									<Code2 className="w-5 h-5 text-indigo-400 shrink-0" />
									<span>Especialidades & Domínio Técnico</span>
								</h2>
								<span className="text-xs font-mono text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-full">
									Full-Stack · DevOps · AI Engineer
								</span>
							</div>

							<div className="space-y-5">
								{EXPERTISE_ITEMS.map((item) => (
									<div key={item.name} className="space-y-1.5">
										<div className="flex items-center justify-between text-sm gap-2">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="font-semibold text-slate-200">
													{item.name}
												</span>
												<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
													{item.category}
												</span>
											</div>
											<span className="font-mono text-xs text-slate-300 tabular-nums font-semibold">
												{item.level}%
											</span>
										</div>
										<p className="text-xs text-slate-400">{item.detail}</p>
										<div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800/80">
											<div
												className={`h-full rounded-full ${item.color}`}
												style={{ width: `${item.level}%` }}
											/>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
							<span>
								Core Stack: Node.js · React · Golang · Linux · DevOps · IA
							</span>
							<span className="text-emerald-400">
								Do código ao servidor em produção
							</span>
						</div>
					</article>
				</section>

				{/* Vitrine Dedicada: Venda de Pequenos Projetos & Entregas Rápidas */}
				<section
					id="pequenos-projetos"
					aria-labelledby="pequenos-projetos-heading"
					className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-7 md:p-10 shadow-lg"
				>
					<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
						<div>
							<h2
								id="pequenos-projetos-heading"
								className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-2.5 mb-2"
							>
								<Zap className="w-6 h-6 text-emerald-400 shrink-0" />
								<span>Pequenos Projetos & Entregas Rápidas</span>
							</h2>
							<p className="text-slate-400 text-sm md:text-base max-w-2xl">
								Precisa de uma solução prática para vender, agendar ou atender
								melhor sem esperar meses? Projetos enxutos com código seu e
								implantação rápida.
							</p>
						</div>

						<a
							href={whatsappUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
						>
							<span>Consultar prazo no WhatsApp</span>
							<ArrowRight className="w-4 h-4" />
						</a>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{SMALL_PROJECT_OFFERS.map((offer) => {
							const IconComponent = getOfferIcon(offer.id);
							const borderAccent =
								offer.accent === "emerald"
									? "hover:border-emerald-500/50"
									: offer.accent === "pink"
										? "hover:border-pink-500/50"
										: "hover:border-indigo-500/50";
							const badgeStyle =
								offer.accent === "emerald"
									? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
									: offer.accent === "pink"
										? "bg-pink-500/15 text-pink-300 border-pink-500/30"
										: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
							const iconBoxStyle =
								offer.accent === "emerald"
									? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
									: offer.accent === "pink"
										? "bg-pink-500/15 text-pink-400 border-pink-500/30"
										: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";

							return (
								<article
									key={offer.id}
									className={`rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between transition-all hover:shadow-xl ${borderAccent}`}
								>
									<div>
										<div className="flex items-center justify-between gap-3 mb-4">
											<div
												className={`w-10 h-10 rounded-lg border flex items-center justify-center ${iconBoxStyle}`}
											>
												<IconComponent className="w-5 h-5" />
											</div>
											<span
												className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full border ${badgeStyle}`}
											>
												{offer.deliveryBadge}
											</span>
										</div>

										<h3 className="text-lg font-bold text-slate-100 mb-1">
											{offer.title}
										</h3>
										<p className="text-xs font-mono text-indigo-300 mb-3">
											Ideal para: {offer.idealFor}
										</p>
										<p className="text-sm text-slate-400 leading-relaxed mb-5">
											{offer.description}
										</p>

										<ul className="space-y-2 mb-6 text-xs sm:text-sm text-slate-300">
											{offer.features.map((feat) => (
												<li key={feat} className="flex items-start gap-2">
													<CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
													<span>{feat}</span>
												</li>
											))}
										</ul>
									</div>

									<div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
										<button
											type="button"
											onClick={() =>
												handleSelectProjectForQuote(offer.whatsappSubject)
											}
											className="text-xs sm:text-sm font-semibold text-slate-200 hover:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer"
										>
											<span>Pedir orçamento deste projeto</span>
											<ArrowRight className="w-4 h-4" />
										</button>

										<a
											href={buildProjectWhatsappUrl({
												tipoProjeto: offer.whatsappSubject,
											})}
											target="_blank"
											rel="noreferrer"
											aria-label={`Pedir orçamento de ${offer.title} no WhatsApp`}
											className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-500 text-slate-300 flex items-center justify-center transition-colors shrink-0"
										>
											<ArrowUpRight className="w-4 h-4" />
										</a>
									</div>
								</article>
							);
						})}

						{/* Card extra para demandas rápidas personalizadas */}
						<article className="rounded-xl border border-indigo-500/30 bg-slate-900/80 p-6 flex flex-col justify-between">
							<div>
								<div className="flex items-center justify-between gap-3 mb-4">
									<div className="w-10 h-10 rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
										<Sparkles className="w-5 h-5" />
									</div>
									<span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/15 text-indigo-300">
										Sob Demanda
									</span>
								</div>

								<h3 className="text-lg font-bold text-slate-100 mb-2">
									Precisa de Outro Pequeno Projeto ou Integração?
								</h3>
								<p className="text-sm text-slate-400 leading-relaxed mb-5">
									Desenvolvo calculadoras de orçamento, painéis internos,
									integrações com APIs (Asaas, Mercado Pago, ERPs) e ferramentas
									específicas para destravar sua rotina.
								</p>

								<ul className="space-y-2 mb-6 text-xs sm:text-sm text-slate-300">
									<li className="flex items-start gap-2">
										<CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
										<span>Integrações de pagamento e emissão de cobrança</span>
									</li>
									<li className="flex items-start gap-2">
										<CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
										<span>
											Dashboards e automação de planilhas operacionais
										</span>
									</li>
									<li className="flex items-start gap-2">
										<CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
										<span>
											Escopo fechado e entrega rápida direto no seu domínio
										</span>
									</li>
								</ul>
							</div>

							<button
								type="button"
								onClick={() =>
									handleSelectProjectForQuote(
										"Pequeno Projeto / Integração Sob Medida",
									)
								}
								className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
							>
								<span>Descrever Minha Ideia</span>
								<ArrowRight className="w-4 h-4" />
							</button>
						</article>
					</div>
				</section>

				{/* Portfólio Section (Inspirada em "Selected Work" da referência) */}
				<section
					id="portfolio"
					aria-labelledby="portfolio-heading"
					className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-7 md:p-10 shadow-lg"
				>
					<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
						<div>
							<h2
								id="portfolio-heading"
								className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-2.5 mb-2"
							>
								<FolderGit2 className="w-6 h-6 text-indigo-400 shrink-0" />
								<span>Trabalhos Selecionados & Cases em Produção</span>
							</h2>
							<p className="text-slate-400 text-sm md:text-base">
								Projetos reais arquitetados e desenvolvidos para operar em
								produção com alta disponibilidade.
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							{(
								[
									{ id: "todos", label: "Todos" },
									{ id: "sistemas", label: "Sistemas & MVPs" },
									{ id: "fintech", label: "Fintech & Web3" },
									{ id: "automacao", label: "Automação & IA" },
								] as const
							).map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveCategory(tab.id)}
									className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
										activeCategory === tab.id
											? "bg-indigo-600 text-white"
											: "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
									}`}
								>
									{tab.label}
								</button>
							))}

							<a
								href="https://github.com/alexandre-henrique-rp"
								target="_blank"
								rel="noreferrer"
								className="ml-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
							>
								<span>Ver GitHub</span>
								<ArrowRight className="w-3.5 h-3.5" />
							</a>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{filteredCases.map((project) => (
							<article
								key={project.id}
								className="group rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 hover:border-indigo-500/50 transition-all flex flex-col justify-between shadow-md hover:shadow-xl"
							>
								<div>
									{/* Preview Visual do Projeto com Badge no Canto Superior Direito (igual à referência) */}
									<div className="h-56 bg-slate-950 relative overflow-hidden border-b border-slate-800/80">
										{project.image ? (
											<img
												src={project.image}
												alt={project.imageAlt}
												loading="lazy"
												width={640}
												height={360}
												className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center bg-slate-950 p-6">
												<div className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3 shadow-lg">
													<div className="flex items-center justify-between border-b border-slate-800 pb-2">
														<span className="text-xs font-mono text-pink-400">
															whatsapp-ai-agent.ts
														</span>
														<span className="text-[11px] font-mono text-emerald-400">
															● online
														</span>
													</div>
													<div className="p-2.5 rounded-lg bg-slate-950 text-xs text-slate-300 border border-slate-800">
														Olá! Gostaria de agendar uma demonstração e receber
														proposta.
													</div>
													<div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-200 ml-6">
														Lead qualificado! Horário reservado na agenda e
														resumo enviado ao comercial.
													</div>
												</div>
											</div>
										)}

										<div className="absolute top-3 left-3">
											<span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-full bg-slate-950/90 text-slate-200 border border-slate-700 backdrop-blur-md">
												{project.roleBadge}
											</span>
										</div>

										<div className="absolute top-3 right-3">
											<span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-500/40 backdrop-blur-md flex items-center gap-1.5">
												<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
												<span>{project.categoryLabel}</span>
											</span>
										</div>
									</div>

									<div className="p-6">
										<h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-white transition-colors">
											{project.title}
										</h3>
										<p className="text-sm text-slate-400 leading-relaxed mb-4">
											{project.description}
										</p>
										<div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 inline-flex items-center gap-1.5">
											<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
											<span>{project.highlight}</span>
										</div>
									</div>
								</div>

								{/* Rodapé do Card: Tags da Stack à esquerda + Botão Quadrado Seta à direita */}
								<div className="px-6 pb-6 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-4">
									<div className="flex flex-wrap gap-1.5">
										{project.tags.map((tag) => (
											<span
												key={tag}
												className="px-2.5 py-1 text-xs font-mono rounded-md bg-slate-950 text-slate-300 border border-slate-800"
											>
												{tag}
											</span>
										))}
									</div>

									{project.liveUrl ? (
										<a
											href={project.liveUrl}
											target="_blank"
											rel="noreferrer"
											aria-label={`Visitar projeto ${project.title}`}
											className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-900 hover:bg-indigo-600 hover:border-indigo-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
										>
											<ExternalLink className="w-4 h-4" />
										</a>
									) : (
										<button
											type="button"
											onClick={() =>
												handleSelectProjectForQuote(
													`Projeto similar a: ${project.title}`,
												)
											}
											aria-label={`Solicitar projeto similar a ${project.title}`}
											className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-900 hover:bg-pink-600 hover:border-pink-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
										>
											<ArrowRight className="w-4 h-4" />
										</button>
									)}
								</div>
							</article>
						))}
					</div>
				</section>

				{/* Marketing para Projetos Maiores: Engenharia Sob Medida & MVPs */}
				<section
					id="solucoes"
					aria-labelledby="solucoes-heading"
					className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-7 md:p-10 shadow-lg"
				>
					<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
						<div>
							<h2
								id="solucoes-heading"
								className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-2.5 mb-2"
							>
								<Cpu className="w-6 h-6 text-pink-400 shrink-0" />
								<span>Engenharia de Sistemas Sob Medida, SaaS & MVPs</span>
							</h2>
							<p className="text-slate-400 text-sm md:text-base max-w-2xl">
								Para startups e empresas com regras de negócio únicas que
								softwares de prateleira não atendem. Arquitetura escalável do
								zero à produção.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<article className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
							<div>
								<div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4">
									<LayoutGrid className="w-5 h-5" />
								</div>
								<h3 className="text-lg font-bold text-slate-100 mb-2">
									Sistemas de Gestão, ERPs & Portais
								</h3>
								<p className="text-sm text-slate-400 leading-relaxed mb-4">
									Substitua planilhas desconectadas e múltiplas assinaturas por
									uma plataforma própria com níveis de acesso, relatórios
									financeiros e regras exatas da sua operação.
								</p>
								<ul className="space-y-2 text-xs sm:text-sm text-slate-300 mb-6">
									<li className="flex items-center gap-2">
										<CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
										<span>Painéis administrativos rápidos e seguros</span>
									</li>
									<li className="flex items-center gap-2">
										<CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
										<span>Integração com bancos, NF-e, assinatura digital</span>
									</li>
								</ul>
							</div>
							<button
								type="button"
								onClick={() =>
									handleSelectProjectForQuote(
										"Sistema de Gestão / ERP Sob Medida",
									)
								}
								className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5 cursor-pointer"
							>
								<span>Orçar sistema sob medida</span>
								<ArrowRight className="w-4 h-4" />
							</button>
						</article>

						<article className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
							<div>
								<div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
									<Rocket className="w-5 h-5" />
								</div>
								<h3 className="text-lg font-bold text-slate-100 mb-2">
									MVPs para Startups & Produtos SaaS
								</h3>
								<p className="text-sm text-slate-400 leading-relaxed mb-4">
									Tire sua startup do papel com uma base tecnológica pronta para
									receber clientes pagantes e investidores, com cobrança
									recorrente e multi-tenancy.
								</p>
								<ul className="space-y-2 text-xs sm:text-sm text-slate-300 mb-6">
									<li className="flex items-center gap-2">
										<CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
										<span>Entregas semanais em ambiente de homologação</span>
									</li>
									<li className="flex items-center gap-2">
										<CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
										<span>
											Repositório Git e infraestrutura 100% no seu nome
										</span>
									</li>
								</ul>
							</div>
							<button
								type="button"
								onClick={() =>
									handleSelectProjectForQuote("MVP para Startup / Produto SaaS")
								}
								className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 cursor-pointer"
							>
								<span>Planejar meu MVP</span>
								<ArrowRight className="w-4 h-4" />
							</button>
						</article>

						<article className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between hover:border-pink-500/50 transition-colors">
							<div>
								<div className="w-10 h-10 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center mb-4">
									<Database className="w-5 h-5" />
								</div>
								<h3 className="text-lg font-bold text-slate-100 mb-2">
									Consultoria, Arquitetura & Refatoração
								</h3>
								<p className="text-sm text-slate-400 leading-relaxed mb-4">
									Seu sistema atual trava, está lento ou difícil de evoluir?
									Realizo diagnóstico de banco de dados, revisão de segurança e
									destravo gargalos técnicos.
								</p>
								<ul className="space-y-2 text-xs sm:text-sm text-slate-300 mb-6">
									<li className="flex items-center gap-2">
										<CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
										<span>Otimização de queries, cache e infraestrutura</span>
									</li>
									<li className="flex items-center gap-2">
										<CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
										<span>Apoio técnico sênior para times em crescimento</span>
									</li>
								</ul>
							</div>
							<button
								type="button"
								onClick={() =>
									handleSelectProjectForQuote(
										"Consultoria & Arquitetura de Software",
									)
								}
								className="text-sm font-semibold text-pink-400 hover:text-pink-300 inline-flex items-center gap-1.5 cursor-pointer"
							>
								<span>Agendar diagnóstico técnico</span>
								<ArrowRight className="w-4 h-4" />
							</button>
						</article>
					</div>
				</section>

				{/* Como Trabalho / Metodologia (Inspirada em "My Work Process" da referência) */}
				<section
					id="processo"
					aria-labelledby="processo-heading"
					className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-7 md:p-10 shadow-lg"
				>
					<h2
						id="processo-heading"
						className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-2.5 mb-10"
					>
						<Layers className="w-6 h-6 text-indigo-400 shrink-0" />
						<span>Meu Processo de Trabalho</span>
					</h2>

					<div className="relative">
						{/* Linha horizontal conectora em telas grandes */}
						<div className="hidden lg:block absolute top-7 left-12 right-12 h-px bg-indigo-500/30 z-0" />

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 relative z-10">
							{PROCESS_STEPS.map((item) => {
								const StepIcon = item.icon;
								return (
									<div
										key={item.step}
										className="flex flex-col items-center text-center group"
									>
										<div className="w-14 h-14 rounded-full bg-slate-950 border-2 border-indigo-500/50 group-hover:border-emerald-400 shadow-[0_0_20px_rgba(79,70,229,0.25)] flex items-center justify-center text-indigo-400 group-hover:text-emerald-400 transition-colors mb-4">
											<StepIcon className="w-5 h-5" />
										</div>
										<span className="text-xs font-mono font-bold text-indigo-400 mb-1 tabular-nums">
											{item.step}
										</span>
										<h3 className="text-base font-bold text-slate-100 mb-2">
											{item.title}
										</h3>
										<p className="text-xs text-slate-400 leading-relaxed">
											{item.description}
										</p>
									</div>
								);
							})}
						</div>
					</div>
				</section>

				{/* Bento Duplo: Prova Social + Em Números (Inspirado em "What Clients Say" + "By The Numbers") */}
				<section
					id="depoimentos"
					aria-labelledby="depoimentos-heading"
					className="grid grid-cols-1 lg:grid-cols-12 gap-6"
				>
					{/* Coluna Esquerda: O Que Dizem os Clientes */}
					<div className="lg:col-span-6 rounded-2xl border border-slate-800/90 bg-slate-950/80 p-7 md:p-8 shadow-lg flex flex-col justify-between">
						<div>
							<h2
								id="depoimentos-heading"
								className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2.5 mb-6"
							>
								<Quote className="w-5 h-5 text-indigo-400 shrink-0" />
								<span>O Que Dizem os Clientes</span>
							</h2>

							<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
								<div className="flex items-center justify-between gap-2 mb-4">
									<div className="flex items-center gap-1 text-amber-400">
										<span className="sr-only">Avaliação 5 de 5 estrelas</span>
										<Star className="w-4 h-4 fill-current" />
										<Star className="w-4 h-4 fill-current" />
										<Star className="w-4 h-4 fill-current" />
										<Star className="w-4 h-4 fill-current" />
										<Star className="w-4 h-4 fill-current" />
									</div>
									<span className="text-xs font-mono text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
										{currentTestimonial.badge}
									</span>
								</div>

								<blockquote className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
									"{currentTestimonial.quote}"
								</blockquote>

								<div className="flex items-center justify-between pt-4 border-t border-slate-800">
									<div>
										<div className="font-bold text-slate-100 text-sm">
											{currentTestimonial.author}
										</div>
										<div className="text-xs text-indigo-400 font-mono">
											{currentTestimonial.role}
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Controles de seleção de depoimento (bolinhas interativas como na referência) */}
						<div className="flex items-center justify-between mt-5">
							<div className="flex items-center gap-2">
								{TESTIMONIALS.map((item, idx) => (
									<button
										key={item.role}
										type="button"
										onClick={() => setActiveTestimonial(idx)}
										aria-label={`Ver depoimento de ${item.role}`}
										className={`h-2.5 rounded-full transition-all cursor-pointer ${
											activeTestimonial === idx
												? "w-7 bg-indigo-400"
												: "w-2.5 bg-slate-700 hover:bg-slate-500"
										}`}
									/>
								))}
							</div>
							<span className="text-xs font-mono text-slate-400 tabular-nums">
								0{activeTestimonial + 1} / 0{TESTIMONIALS.length}
							</span>
						</div>
					</div>

					{/* Coluna Direita: Em Números & Compromissos */}
					<div className="lg:col-span-6 rounded-2xl border border-slate-800/90 bg-slate-950/80 p-7 md:p-8 shadow-lg flex flex-col justify-between">
						<div>
							<h2 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2.5 mb-6">
								<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
								<span>Em Números & Garantias</span>
							</h2>

							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
								<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center flex flex-col justify-center">
									<div className="text-2xl md:text-3xl font-extrabold text-indigo-400 mb-1 tabular-nums">
										8+
									</div>
									<div className="text-xs text-slate-400 leading-snug">
										Sistemas & MVPs no Ar
									</div>
								</div>

								<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center flex flex-col justify-center">
									<div className="text-2xl md:text-3xl font-extrabold text-emerald-400 mb-1 tabular-nums">
										100%
									</div>
									<div className="text-xs text-slate-400 leading-snug">
										Código Proprietário
									</div>
								</div>

								<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center flex flex-col justify-center">
									<div className="text-2xl md:text-3xl font-extrabold text-pink-400 mb-1 tabular-nums">
										5+
									</div>
									<div className="text-xs text-slate-400 leading-snug">
										Anos de Experiência
									</div>
								</div>

								<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center flex flex-col justify-center">
									<div className="text-2xl md:text-3xl font-extrabold text-slate-100 mb-1 tabular-nums">
										NDA
									</div>
									<div className="text-xs text-slate-400 leading-snug">
										Sigilo em Contrato
									</div>
								</div>
							</div>
						</div>

						<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5 flex items-center justify-between gap-4">
							<div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
								<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
								<span>
									Acordo de confidencialidade (NDA), entrega no seu repositório
									e garantia técnica pós-deploy.
								</span>
							</div>
						</div>
					</div>
				</section>

				{/* FAQ Section */}
				<section
					id="faq"
					aria-labelledby="faq-heading"
					className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-7 md:p-10 shadow-lg"
				>
					<h2
						id="faq-heading"
						className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-2.5 mb-8"
					>
						<MessageSquare className="w-6 h-6 text-indigo-400 shrink-0" />
						<span>Perguntas Frequentes</span>
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{FAQ_ITEMS.map((item, index) => (
							<div
								key={item.q}
								className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden transition-colors hover:border-slate-700 self-start"
							>
								<button
									type="button"
									onClick={() => toggleFaq(index)}
									className="w-full text-left p-5 font-semibold text-slate-100 flex justify-between items-center gap-4 text-sm md:text-base cursor-pointer"
								>
									<span>{item.q}</span>
									<span className="text-indigo-400 text-lg font-mono shrink-0">
										{openFaq === index ? "−" : "+"}
									</span>
								</button>
								{openFaq === index && (
									<div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed border-t border-slate-800/80 pt-3.5">
										{item.a}
									</div>
								)}
							</div>
						))}
					</div>
				</section>

				{/* CTA Section & Contact (Inspirada em "Let's Build Something Great" da referência) */}
				<section
					id="contato"
					aria-labelledby="contato-heading"
					className="rounded-2xl border border-indigo-500/40 bg-slate-950/90 p-7 md:p-10 shadow-[0_20px_50px_-15px_rgba(79,70,229,0.3)] relative overflow-hidden"
				>
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
						{/* Coluna 1: Chamada Direta */}
						<div className="lg:col-span-4 flex flex-col justify-between space-y-6">
							<div>
								<h2
									id="contato-heading"
									className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-2.5 mb-3"
								>
									<Send className="w-6 h-6 text-indigo-400 shrink-0" />
									<span>Vamos Construir Seu Projeto</span>
								</h2>
								<p className="text-slate-300 text-sm md:text-base leading-relaxed">
									Tem uma ideia de sistema ou precisa de um pequeno projeto
									rápido rodando na sua empresa? Me envie uma mensagem e receba
									um direcionamento técnico honesto.
								</p>
							</div>

							<div className="space-y-3">
								<a
									href={whatsappUrl}
									target="_blank"
									rel="noreferrer"
									className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] transition-all text-sm"
								>
									<MessageSquare className="w-4 h-4" />
									<span>Chamar Direto no WhatsApp</span>
									<ArrowRight className="w-4 h-4" />
								</a>
								<p className="text-xs font-mono text-slate-400">
									Resposta rápida em horário comercial · Orçamento sem
									compromisso
								</p>
							</div>
						</div>

						{/* Coluna 2: Informações de Contato & Disponibilidade */}
						<div className="lg:col-span-3 space-y-4 lg:border-l lg:border-r border-slate-800/80 lg:px-6">
							<div className="flex items-start gap-3">
								<div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
									<Mail className="w-4 h-4" />
								</div>
								<div>
									<div className="text-xs text-slate-400">E-mail</div>
									<a
										href="mailto:contato@kingdevtec.com"
										className="text-sm font-medium text-slate-200 hover:text-indigo-400 transition-colors break-all"
									>
										contato@kingdevtec.com
									</a>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
									<MessageSquare className="w-4 h-4" />
								</div>
								<div>
									<div className="text-xs text-slate-400">WhatsApp Direto</div>
									<a
										href={whatsappUrl}
										target="_blank"
										rel="noreferrer"
										className="text-sm font-medium text-slate-200 hover:text-emerald-400 transition-colors"
									>
										+55 (16) 99602-9107
									</a>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
									<MapPin className="w-4 h-4" />
								</div>
								<div>
									<div className="text-xs text-slate-400">Base de Operação</div>
									<div className="text-sm font-medium text-slate-200">
										São Paulo, Brasil (100% Remoto)
									</div>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
									<Clock className="w-4 h-4" />
								</div>
								<div>
									<div className="text-xs text-slate-400">Status da Agenda</div>
									<div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
										<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
										<span>Disponível para novos projetos</span>
									</div>
								</div>
							</div>
						</div>

						{/* Coluna 3: Formulário Interativo que Monta o Orçamento no WhatsApp */}
						<form
							onSubmit={handleContactSubmit}
							className="lg:col-span-5 space-y-3.5"
						>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
								<div>
									<label
										htmlFor="contato-nome"
										className="block text-xs font-medium text-slate-400 mb-1"
									>
										Seu Nome
									</label>
									<input
										id="contato-nome"
										type="text"
										value={nome}
										onChange={(e) => setNome(e.target.value)}
										placeholder="Ex.: João Martins"
										className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none"
									/>
								</div>

								<div>
									<label
										htmlFor="contato-empresa"
										className="block text-xs font-medium text-slate-400 mb-1"
									>
										Empresa ou Seu WhatsApp
									</label>
									<input
										id="contato-empresa"
										type="text"
										value={contato}
										onChange={(e) => setContato(e.target.value)}
										placeholder="Ex.: Clínica Vida / (11) 99999-9999"
										className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none"
									/>
								</div>
							</div>

							<div>
								<label
									htmlFor="contato-tipo"
									className="block text-xs font-medium text-slate-400 mb-1"
								>
									O que você deseja construir?
								</label>
								<select
									id="contato-tipo"
									value={tipoProjeto}
									onChange={(e) => setTipoProjeto(e.target.value)}
									className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none"
								>
									<option value="Pequeno Projeto: Cardápio / Agendamento / Site / Catálogo">
										Pequeno Projeto: Cardápio / Agendamento / Site / Catálogo
									</option>
									<option value="Cardápio Digital + Pedido no WhatsApp">
										Cardápio Digital + Pedido no WhatsApp
									</option>
									<option value="Sistema de Agendamento Online">
										Sistema de Agendamento Online
									</option>
									<option value="Landing Page / Site Institucional">
										Landing Page / Site Institucional de Alta Conversão
									</option>
									<option value="Catálogo / Vitrine Online">
										Catálogo / Vitrine Online com Orçamento
									</option>
									<option value="Bot de Atendimento & Automação WhatsApp">
										Bot de Atendimento & Automação WhatsApp
									</option>
									<option value="Sistema de Gestão / ERP Sob Medida">
										Sistema de Gestão / ERP Sob Medida
									</option>
									<option value="MVP para Startup / Produto SaaS">
										MVP para Startup / Produto SaaS
									</option>
									<option value="Consultoria & Arquitetura de Software">
										Consultoria & Arquitetura de Software
									</option>
								</select>
							</div>

							<div>
								<label
									htmlFor="contato-mensagem"
									className="block text-xs font-medium text-slate-400 mb-1"
								>
									Resumo da sua necessidade
								</label>
								<textarea
									id="contato-mensagem"
									rows={3}
									value={mensagem}
									onChange={(e) => setMensagem(e.target.value)}
									placeholder="Conte rapidamente como funciona seu negócio hoje e o que gostaria de lançar ou automatizar..."
									className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none"
								/>
							</div>

							<button
								type="submit"
								className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-[0_10px_25px_-5px_rgba(79,70,229,0.6)] transition-all flex items-center justify-center gap-2 cursor-pointer"
							>
								<span>Enviar Mensagem no WhatsApp</span>
								<Send className="w-4 h-4" />
							</button>
						</form>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="relative z-10 py-10 px-6 md:px-8 border-t border-slate-800/80 bg-black">
				<div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
					<div className="flex items-center">
						<img
							src="/Logo_KingDevTec_04.png"
							alt="King Dev Tec"
							loading="lazy"
							width={140}
							height={34}
							className="h-8 w-auto object-contain"
						/>
					</div>

					<div className="text-slate-400 text-xs font-mono text-center">
						© {new Date().getFullYear()} King Dev Tec — Engenharia de Software
						Independente. Todos os direitos reservados.
					</div>

					<div className="flex items-center gap-5 text-xs font-medium text-slate-400">
						<a href="#topo" className="hover:text-slate-200 transition-colors">
							Início
						</a>
						<a href="#sobre" className="hover:text-slate-200 transition-colors">
							Sobre
						</a>
						<a
							href="#pequenos-projetos"
							className="hover:text-slate-200 transition-colors"
						>
							Pequenos Projetos
						</a>
						<a
							href="#portfolio"
							className="hover:text-slate-200 transition-colors"
						>
							Portfólio
						</a>
						<a
							href="#contato"
							className="hover:text-slate-200 transition-colors"
						>
							Contato
						</a>
						<a
							href="#topo"
							aria-label="Voltar ao topo da página"
							className="w-9 h-9 rounded-full border border-slate-800 bg-slate-900 hover:border-indigo-500/50 hover:text-indigo-400 flex items-center justify-center text-slate-300 transition-colors"
						>
							<ArrowUp className="w-4 h-4" />
						</a>
					</div>
				</div>
			</footer>
		</div>
	);
}
