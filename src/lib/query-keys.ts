// ==========================================================================
// King Ops — query-keys.ts
// --------------------------------------------------------------------------
// Query keys centralizadas. Use sempre estas constantes em useQuery e nos
// invalidates — nunca string solta.
// ==========================================================================

export const authKeys = {
	all: ["auth"] as const,
	me: () => [...authKeys.all, "me"] as const,
};

export const leadKeys = {
	all: ["leads"] as const,
	list: (filtros?: {
		etapa?: string;
		busca?: string;
		origem?: string;
		page?: number;
		pageSize?: number;
	}) => [...leadKeys.all, "list", filtros ?? {}] as const,
	detail: (uuid: string) => [...leadKeys.all, "detail", uuid] as const,
};

export const interacaoKeys = {
	all: ["interacoes"] as const,
	byLead: (leadUuid: string) => [...interacaoKeys.all, leadUuid] as const,
};

export const projetoKeys = {
	all: ["projetos"] as const,
	list: (filtros?: { estado?: string; busca?: string }) =>
		[...projetoKeys.all, "list", filtros ?? {}] as const,
	detail: (uuid: string) => [...projetoKeys.all, "detail", uuid] as const,
	kanban: (uuid: string) => [...projetoKeys.all, "kanban", uuid] as const,
	orcamento: (uuid: string) =>
		[...projetoKeys.all, "orcamento", uuid] as const,
};

export const funilKeys = {
	all: ["funil"] as const,
	byLead: (leadUuid: string) => [...funilKeys.all, "lead", leadUuid] as const,
};

export const questionarioKeys = {
	all: ["questionario"] as const,
	byProjeto: (projetoUuid: string) =>
		[...questionarioKeys.all, "projeto", projetoUuid] as const,
};

export const parcelaKeys = {
	all: ["parcelas"] as const,
	list: (filtros?: { status?: string; projetoUuid?: string }) =>
		[...parcelaKeys.all, "list", filtros ?? {}] as const,
};

export const configKeys = {
	all: ["config"] as const,
	priceConfig: () => [...configKeys.all, "priceConfig"] as const,
	empresa: () => [...configKeys.all, "empresa"] as const,
};

export const operadorKeys = {
	all: ["operador"] as const,
	me: () => [...operadorKeys.all, "me"] as const,
};

// Legado: alias para a rota existente (leads.index.tsx) que importa
// `queryKeys.leads.all`. Mantido para compat enquanto a rota não é
// migrada para `leadKeys.all`.
export const queryKeys = {
	leads: { all: ["leads"] as const },
	operador: { all: ["operador"] as const },
};
