// ==========================================================================
// King Ops — lib/auth-helper.ts
// --------------------------------------------------------------------------
// Helper client-side para `beforeLoad` de rotas privadas. Verifica se há
// sessão ativa; se não, redireciona para /login com `redirect` na URL.
//
// Como as server functions lançam "UNAUTHORIZED" quando não há cookie,
// este guard evita o 500 e dá UX melhor.
// ==========================================================================

import { redirect } from "@tanstack/react-router";
import { getCurrentUserServerFn } from "#/api/auth";

export async function requireUserOrRedirect(to = "/login", from?: string) {
	const { user } = await getCurrentUserServerFn();
	if (!user) {
		// href monta a URL direto — `redirect` não é search param válido
		// de /login, então a forma { to, search } não passa no typecheck.
		throw redirect(
			from ? { href: `${to}?redirect=${encodeURIComponent(from)}` } : { href: to },
		);
	}
	return user;
}
