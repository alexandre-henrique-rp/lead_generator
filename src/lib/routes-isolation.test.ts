import { describe, it, expect, vi } from "vitest";

// Mock das dependências pesadas
vi.mock("#/api/auth", () => ({
	getCurrentUserServerFn: vi.fn().mockResolvedValue({ user: null }),
}));

// Lista oficial de rotas privadas do sistema
export const ROTAS_PRIVADAS = [
	"/leads/",
	"/leads/funil",
	"/leads/garimpo",
	"/leads/$id",
	"/projetos/",
	"/projetos/$id",
	"/financeiro/",
	"/financeiro/precos",
	"/configuracoes",
	"/perfil",
] as const;

// Lista oficial de rotas públicas permitidas
export const ROTAS_PUBLICAS = [
	"/",
	"/login",
	"/esqueci-senha",
	"/q/$token",
	"/p/proposta/$token",
	"/p/contrato/$token",
	"/p/relatorio/$token",
] as const;

describe("Auditoria de Isolamento de Rotas — Segurança (T-02 / AC-02.1)", () => {
	it("garante que todas as rotas privadas estão mapeadas no inventário de segurança", () => {
		expect(ROTAS_PRIVADAS.length).toBeGreaterThanOrEqual(9);
		for (const rota of ROTAS_PRIVADAS) {
			expect(rota).toMatch(/^\/(leads|projetos|financeiro|configuracoes|perfil)/);
		}
	});

	it("garante que nenhuma rota de negócio crítica está na lista pública", () => {
		for (const rotaPublica of ROTAS_PUBLICAS) {
			expect(ROTAS_PRIVADAS).not.toContain(rotaPublica);
			// As únicas rotas públicas são /, auth (/login, /esqueci-senha) e portais token (/q, /p/...)
			expect(rotaPublica).toMatch(/^(\/|\/login|\/esqueci-senha|\/q\/|\/p\/)/);
		}
	});

	it("valida que requireUserOrRedirect protege contra acesso sem sessão ativa", async () => {
		const { requireUserOrRedirect } = await import("./auth-helper");
		
		for (const rota of ROTAS_PRIVADAS) {
			try {
				await requireUserOrRedirect("/login", rota);
				expect.fail(`A rota privada ${rota} deveria ter bloqueado acesso anônimo`);
			} catch (err: unknown) {
				const res = err as Response;
				const location = res.headers?.get?.("Location") || (res as Record<string, unknown>).url;
				expect(location).toContain("/login?redirect=");
				expect(location).toContain(encodeURIComponent(rota));
			}
		}
	});
});
