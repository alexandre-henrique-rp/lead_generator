export type PillState = "concluida" | "atual" | "futura" | "perdida";

export function getPillState<T extends string>(
	etapas: readonly { value: T; label: string }[],
	atual: T,
	etapa: T,
	lostValue?: T,
): PillState {
	if (etapa === atual) {
		return lostValue && etapa === lostValue ? "perdida" : "atual";
	}
	const atualIndex = etapas.findIndex((e) => e.value === atual);
	const etapaIndex = etapas.findIndex((e) => e.value === etapa);
	if (atualIndex === -1 || etapaIndex === -1) return "futura";
	return etapaIndex < atualIndex ? "concluida" : "futura";
}

export function getNextEtapa<T extends string>(
	etapas: readonly { value: T; label: string }[],
	atual: T,
	lostValue?: T,
): { value: T; label: string } | null {
	const idx = etapas.findIndex((e) => e.value === atual);
	if (idx === -1 || idx >= etapas.length - 1) return null;
	const next = etapas[idx + 1];
	if (lostValue && next.value === lostValue) return null;
	return next;
}
