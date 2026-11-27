export type CnpjProvider = "BRASILAPI" | "OPEN_CNPJ";

function shouldFallbackToOpenCnpj(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);

	return (
		message.startsWith("API_ERROR:5") ||
		message.startsWith("API_ERROR:403") ||
		message.startsWith("NETWORK_ERROR") ||
		message === "fetch failed" ||
		message.includes("ECONNREFUSED") ||
		message.includes("ETIMEDOUT") ||
		message.includes("ENOTFOUND")
	);
}

/**
 * Usa OpenCNPJ quando a BrasilAPI está indisponível ou bloqueia este servidor.
 * Erros do documento e limite de requisições continuam sendo definitivos.
 */
export async function consultarCnpjComFallback<T>(
	brasilApi: () => Promise<T>,
	openCnpj: () => Promise<T>,
	onFallback?: (error: unknown) => void,
): Promise<{ data: T; fonte: CnpjProvider }> {
	try {
		return { data: await brasilApi(), fonte: "BRASILAPI" };
	} catch (error) {
		if (!shouldFallbackToOpenCnpj(error)) {
			throw error;
		}

		onFallback?.(error);
		return { data: await openCnpj(), fonte: "OPEN_CNPJ" };
	}
}
