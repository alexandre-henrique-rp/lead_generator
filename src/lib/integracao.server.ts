// ==========================================================================
// integracao.server.ts — leitura das chaves de API do banco (server-only).
// NUNCA importar este arquivo de rotas/componentes (import protection).
//
// As server functions de integração (AIsa, Google Maps, Gemini, OpenRouter,
// SMTP) usam este módulo para resolver a chave EFETIVA:
//   1. banco (ConfiguracaoIntegracao, singleton id=1) — tem precedência
//   2. process.env — fallback apenas durante a migração para o banco
//
// Os valores são SEMPRE devolvidos em claro SOMENTE para dentro do
// servidor. As server functions que expõem config ao client (./api/integracao)
// devolvem apenas booleanos "definida" + prévia mascarada.
// ==========================================================================

export interface IntegracaoCredenciais {
	aisaApiKey: string | null;
	googleMapsApiKey: string | null;
	geminiApiKey: string | null;
	geminiModelo: string | null;
	/** Gate de custo do Gemini: false = cadeia de fallback só no modelo gratuito. */
	geminiPermitirPago: boolean;
	openRouterApiKey: string | null;
	openRouterModelo: string | null;
	smtpHost: string | null;
	smtpPorta: number | null;
	smtpUsuario: string | null;
	smtpSenha: string | null;
}

export async function getIntegracaoCredenciais(): Promise<IntegracaoCredenciais> {
	const { prisma } = await import("#/db");
	const row =
		(await prisma.configuracaoIntegracao.findUnique({ where: { id: 1 } })) ??
		(await prisma.configuracaoIntegracao.create({ data: { id: 1 } }));

	return {
		aisaApiKey: row.aisaApiKey,
		googleMapsApiKey: row.googleMapsApiKey,
		geminiApiKey: row.geminiApiKey,
		geminiModelo: row.geminiModelo,
		geminiPermitirPago: row.geminiPermitirPago ?? false,
		openRouterApiKey: row.openRouterApiKey,
		openRouterModelo: row.openRouterModelo,
		smtpHost: row.smtpHost,
		smtpPorta: row.smtpPorta,
		smtpUsuario: row.smtpUsuario,
		smtpSenha: row.smtpSenha,
	};
}

/**
 * Resolve a chave efetiva: banco primeiro, env como fallback de migração.
 * Retorna string vazia quando nenhuma fonte tem valor.
 */
export function resolverChave(
	db: string | null | undefined,
	envValue: string | undefined,
): string {
	const doBanco = (db ?? "").trim();
	if (doBanco.length > 0) return doBanco;
	return (envValue ?? "").trim();
}
