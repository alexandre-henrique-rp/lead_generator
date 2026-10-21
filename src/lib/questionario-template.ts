// ==========================================================================
// lead_generator — questionario-template.ts
// Template de perguntas do levantamento de requisitos (vinculado ao projeto).
// Negócio (doc 23) + escopo técnico + operacional. Perguntas suplementares
// são adicionadas pelo operador por projeto (fora deste template).
// ==========================================================================

export type PerguntaTipo = "TEXTO" | "TEXTO_LONGO" | "SELECT";

export interface PerguntaTemplate {
	chave: string; // id estável da pergunta (usado nas respostas)
	bloco: string;
	pergunta: string;
	tipo: PerguntaTipo;
	obrigatorio: boolean;
	opcoes?: string[]; // para SELECT
	ajuda?: string;
}

export const QUESTIONARIO_TEMPLATE: PerguntaTemplate[] = [
	// ── Bloco 1 — Projeto ──
	{
		chave: "tipo_projeto",
		bloco: "Projeto",
		pergunta: "Tipo de projeto",
		tipo: "SELECT",
		obrigatorio: true,
		opcoes: [
			"Site institucional",
			"Sistema sob medida",
			"E-commerce",
			"App mobile",
			"Outro",
		],
	},
	{
		chave: "plataforma",
		bloco: "Projeto",
		pergunta: "Plataforma alvo",
		tipo: "SELECT",
		obrigatorio: true,
		opcoes: ["Web", "Mobile", "Ambos (Web + Mobile)", "Desktop"],
	},

	// ── Bloco 2 — Negócio ──
	{
		chave: "como_recebe",
		bloco: "Sobre o Negócio",
		pergunta: "Como você recebe pedidos/agendamentos hoje?",
		tipo: "TEXTO_LONGO",
		obrigatorio: true,
	},
	{
		chave: "problemas",
		bloco: "Sobre o Negócio",
		pergunta: "Quais problemas isso causa no dia a dia?",
		tipo: "TEXTO_LONGO",
		obrigatorio: true,
	},
	{
		chave: "ja_tentou",
		bloco: "Sobre o Negócio",
		pergunta: "Já tentou resolver antes? Como?",
		tipo: "TEXTO_LONGO",
		obrigatorio: false,
	},
	{
		chave: "expectativa",
		bloco: "Sobre o Negócio",
		pergunta: "O que você espera que o sistema faça por você?",
		tipo: "TEXTO_LONGO",
		obrigatorio: true,
	},
	{
		chave: "usuarios",
		bloco: "Sobre o Negócio",
		pergunta: "Quem vai usar o sistema? Quantas pessoas?",
		tipo: "TEXTO",
		obrigatorio: true,
	},
	{
		chave: "sistema_atual",
		bloco: "Sobre o Negócio",
		pergunta: "Tem algum site ou sistema hoje? Qual? (cole o link)",
		tipo: "TEXTO",
		obrigatorio: false,
	},

	// ── Bloco 3 — Escopo técnico ──
	{
		chave: "funcionalidades",
		bloco: "Escopo Técnico",
		pergunta: "Principais funcionalidades desejadas (liste)",
		tipo: "TEXTO_LONGO",
		obrigatorio: true,
	},
	{
		chave: "integracoes",
		bloco: "Escopo Técnico",
		pergunta:
			"Integrações necessárias (pagamento, WhatsApp, e-mail, ERP, nota fiscal…)",
		tipo: "TEXTO_LONGO",
		obrigatorio: false,
	},
	{
		chave: "login_perfis",
		bloco: "Escopo Técnico",
		pergunta: "Precisa de login e perfis de acesso? Quais perfis?",
		tipo: "TEXTO",
		obrigatorio: false,
	},
	{
		chave: "volume",
		bloco: "Escopo Técnico",
		pergunta: "Volume esperado (usuários, pedidos/mês, etc.)",
		tipo: "TEXTO",
		obrigatorio: false,
	},

	// ── Bloco 4 — Operacional ──
	{
		chave: "prazo",
		bloco: "Operacional",
		pergunta: "Prazo desejado de entrega",
		tipo: "TEXTO",
		obrigatorio: false,
	},
	{
		chave: "orcamento",
		bloco: "Operacional",
		pergunta: "Faixa de orçamento (opcional)",
		tipo: "TEXTO",
		obrigatorio: false,
	},
	{
		chave: "referencias",
		bloco: "Operacional",
		pergunta: "Referências (sites/apps que você gosta — cole os links)",
		tipo: "TEXTO_LONGO",
		obrigatorio: false,
	},
	{
		chave: "identidade_visual",
		bloco: "Operacional",
		pergunta:
			"Identidade visual (tem logo/cores/marca? cole links ou descreva)",
		tipo: "TEXTO_LONGO",
		obrigatorio: false,
	},
];
