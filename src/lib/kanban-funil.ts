// ==========================================================================
// King Ops — lib/kanban-funil.ts
// --------------------------------------------------------------------------
// Lógica de negócio, tipos e utilitários de agrupamento para o
// Kanban do Funil de Vendas com Drag & Drop (/leads/funil).
// ==========================================================================

export type ColunaKanbanKey =
	| "NOVO"
	| "CONTATADO"
	| "QUALIFICADO"
	| "PROPOSTA"
	| "NEGOCIACAO"
	| "FECHADO";

export interface ColunaConfig {
	key: ColunaKanbanKey;
	titulo: string;
	etapas: string[];
	corBorda: string;
	corBadge: string;
	corTexto: string;
	sufixoValor?: string;
}

export const COLUNAS_KANBAN: ColunaConfig[] = [
	{
		key: "NOVO",
		titulo: "1 · NOVO LEAD",
		etapas: ["NOVO"],
		corBorda: "border-sky-500/40",
		corBadge: "bg-sky-950/60 text-sky-400 border border-sky-800/80",
		corTexto: "text-sky-400",
		sufixoValor: "est.",
	},
	{
		key: "CONTATADO",
		titulo: "2 · CONTATADO",
		etapas: ["CONTATADO"],
		corBorda: "border-indigo-500/40",
		corBadge: "bg-indigo-950/60 text-indigo-400 border border-indigo-800/80",
		corTexto: "text-indigo-400",
		sufixoValor: "est.",
	},
	{
		key: "QUALIFICADO",
		titulo: "3 · QUALIFICADO",
		etapas: ["QUALIFICADO", "DIAGNOSTICO"],
		corBorda: "border-violet-500/40",
		corBadge: "bg-violet-950/60 text-violet-400 border border-violet-800/80",
		corTexto: "text-violet-400",
		sufixoValor: "",
	},
	{
		key: "PROPOSTA",
		titulo: "4 · PROPOSTA ENVIADA",
		etapas: ["PROPOSTA", "PROPOSTA_ENVIADA"],
		corBorda: "border-amber-500/40",
		corBadge: "bg-amber-950/60 text-amber-400 border border-amber-800/80",
		corTexto: "text-amber-400",
		sufixoValor: "",
	},
	{
		key: "NEGOCIACAO",
		titulo: "5 · EM NEGOCIAÇÃO",
		etapas: ["NEGOCIACAO", "NEGOCIANDO"],
		corBorda: "border-violet-500/40",
		corBadge: "bg-violet-950/60 text-violet-400 border border-violet-800/80",
		corTexto: "text-violet-400",
		sufixoValor: "",
	},
	{
		key: "FECHADO",
		titulo: "6 · GANHO ✓ / PERDIDO ✕",
		etapas: ["GANHO", "PERDIDO", "FECHADO_GANHO", "FECHADO_PERDIDO"],
		corBorda: "border-emerald-500/40",
		corBadge: "bg-emerald-950/60 text-emerald-400 border border-emerald-800/80",
		corTexto: "text-emerald-400",
		sufixoValor: "ganhos",
	},
];

export interface KanbanLeadCard {
	id: string;
	nome: string;
	razaoSocial?: string;
	cnpj?: string;
	etapa: string;
	telefone: string;
	temWhatsapp: boolean;
	cidade?: string;
	valorEstimadoCentavos: number;
	horasEstimadas: number;
	createdAt: string;
	origem: string;
}

export interface ColunaAgrupada {
	config: ColunaConfig;
	leads: KanbanLeadCard[];
	totalValorCentavos: number;
	quantidade: number;
	ganhosCount?: number;
	perdidosCount?: number;
}

/** Identifica a qual coluna kanban pertence uma dada etapa do lead. */
export function mapearEtapaParaColuna(etapa: string): ColunaKanbanKey {
	const etapaNorm = etapa.toUpperCase();
	for (const col of COLUNAS_KANBAN) {
		if (col.etapas.includes(etapaNorm)) {
			return col.key;
		}
	}
	return "NOVO";
}

/** Agrupa uma lista de leads nas 6 colunas do Kanban com somatórios. */
export function agruparLeadsNoKanban(leads: KanbanLeadCard[]): Record<ColunaKanbanKey, ColunaAgrupada> {
	const resultado = {} as Record<ColunaKanbanKey, ColunaAgrupada>;

	for (const col of COLUNAS_KANBAN) {
		resultado[col.key] = {
			config: col,
			leads: [],
			totalValorCentavos: 0,
			quantidade: 0,
			ganhosCount: 0,
			perdidosCount: 0,
		};
	}

	for (const lead of leads) {
		const colKey = mapearEtapaParaColuna(lead.etapa);
		const col = resultado[colKey];
		if (col) {
			col.leads.push(lead);
			const etapaUpper = (lead.etapa || "").toUpperCase();
			const isPerdido = etapaUpper.includes("PERDIDO");

			if (colKey === "FECHADO") {
				if (isPerdido) {
					col.perdidosCount = (col.perdidosCount || 0) + 1;
				} else {
					col.ganhosCount = (col.ganhosCount || 0) + 1;
					col.totalValorCentavos += lead.valorEstimadoCentavos || 0;
				}
			} else {
				col.totalValorCentavos += lead.valorEstimadoCentavos || 0;
			}
			col.quantidade += 1;
		}
	}

	return resultado;
}

/** Formata valor em centavos para moeda brasileira R$ */
export function formatarCentavosParaReais(centavos: number): string {
	if (!centavos || centavos <= 0) return "R$ 0,00";
	return (centavos / 100).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});
}

/** Retorna a etapa padrão do banco correspondente à coluna do Kanban */
export function mapearColunaParaEtapaPadrao(colKey: ColunaKanbanKey): string {
	switch (colKey) {
		case "NOVO":
			return "NOVO";
		case "CONTATADO":
			return "CONTATADO";
		case "QUALIFICADO":
			return "QUALIFICADO";
		case "PROPOSTA":
			return "PROPOSTA";
		case "NEGOCIACAO":
			return "NEGOCIACAO";
		case "FECHADO":
			return "GANHO";
		default:
			return "NOVO";
	}
}
