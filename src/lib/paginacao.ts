// ==========================================================================
// lib/paginacao.ts — helpers de paginação reutilizáveis.
// ==========================================================================

/**
 * Janela de páginas para o controle de paginação.
 * Sempre inclui primeira/última e vizinhas da página atual;
 * lacunas viram "…". Máximo de ~7 botões.
 */
export function paginasVisiveis(
	page: number,
	totalPages: number,
): (number | "…")[] {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}
	const janela = [
		1,
		2,
		page - 1,
		page,
		page + 1,
		totalPages - 1,
		totalPages,
	].filter((n) => n >= 1 && n <= totalPages);
	const unicas = [...new Set(janela)].sort((a, b) => a - b);

	const out: (number | "…")[] = [];
	for (let i = 0; i < unicas.length; i++) {
		if (i > 0 && unicas[i] - unicas[i - 1] > 1) out.push("…");
		out.push(unicas[i]);
	}
	return out;
}
