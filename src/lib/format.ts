/**
 * Utilitários de formatação e conversão de valores.
 * Regras:
 * - Valores monetários trafegam no banco de dados e APIs em centavos (números inteiros).
 * - Exibição amigável formatada para pt-BR.
 */

/**
 * Converte valor em centavos para formato string em Real (ex: 150000 -> "R$ 1.500,00").
 */
export function formatCurrencyBRL(centavos: number | null | undefined): string {
	if (centavos == null || Number.isNaN(centavos)) {
		return "R$ 0,00";
	}
	return (centavos / 100).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});
}

/**
 * Converte string digitada pelo usuário em centavos (ex: "R$ 1.500,00" ou "1500,00" -> 150000).
 */
export function parseCurrencyBRLToCents(
	val: string | number | null | undefined,
): number {
	if (val == null) return 0;
	if (typeof val === "number") return Math.round(val);

	const clean = val.replace(/\D/g, "");
	if (!clean) return 0;
	return Number.parseInt(clean, 10);
}

/**
 * Formata data no padrão brasileiro dd/mm/aaaa ou dd/mm/aaaa às hh:mm.
 */
export function formatDateBR(
	dateInput: string | Date | number | null | undefined,
	includeTime = false,
): string {
	if (!dateInput) return "-";
	const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
	if (Number.isNaN(date.getTime())) return "-";

	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();

	if (!includeTime) {
		return `${day}/${month}/${year}`;
	}

	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

/**
 * Retorna tempo relativo amigável (ex: "há 2 horas", "ontem", "há 3 dias").
 */
export function formatRelativeTime(
	dateInput: string | Date | number | null | undefined,
): string {
	if (!dateInput) return "-";
	const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
	if (Number.isNaN(date.getTime())) return "-";

	const diffMs = Date.now() - date.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffMinutes < 1) return "agora há pouco";
	if (diffMinutes < 60) return `há ${diffMinutes} min`;
	if (diffHours < 24) return `há ${diffHours} h`;
	if (diffDays === 1) return "ontem";
	if (diffDays < 30) return `há ${diffDays} dias`;
	return formatDateBR(date);
}
