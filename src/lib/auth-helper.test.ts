import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireUserOrRedirect } from "./auth-helper";

// Mock da server function de auth
vi.mock("#/api/auth", () => ({
	getCurrentUserServerFn: vi.fn(),
}));

import { getCurrentUserServerFn } from "#/api/auth";

describe("requireUserOrRedirect (Guard de Segurança de Rotas Privadas)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna o usuário quando a sessão está ativa", async () => {
		const fakeUser = {
			id: 1,
			uuid: "user-123",
			nome: "Alex King",
			email: "alex@kingdev.com.br",
			telefone: null,
			cnpj: null,
		};
		vi.mocked(getCurrentUserServerFn).mockResolvedValueOnce({ user: fakeUser });

		const user = await requireUserOrRedirect("/login", "/leads");
		expect(user).toEqual(fakeUser);
	});

	it("lança redirect para /login com parâmetro redirect quando deslogado", async () => {
		vi.mocked(getCurrentUserServerFn).mockResolvedValueOnce({ user: null });

		try {
			await requireUserOrRedirect("/login", "/projetos/proj-uuid-1");
			expect.fail("Deveria ter lançado redirect");
		} catch (err: unknown) {
			expect(err).toBeDefined();
			// No TanStack Router, redirect lança uma Response 307 ou 302 com header Location ou propriedade href/to
			const res = err as Response & { href?: string; to?: string };
			const location = res.headers?.get?.("Location") || res.href || (res as Record<string, unknown>).url;
			expect(location).toContain("/login?redirect=%2Fprojetos%2Fproj-uuid-1");
		}
	});

	it("lança redirect simples para /login quando não informado o caminho de origem", async () => {
		vi.mocked(getCurrentUserServerFn).mockResolvedValueOnce({ user: null });

		try {
			await requireUserOrRedirect("/login");
			expect.fail("Deveria ter lançado redirect");
		} catch (err: unknown) {
			expect(err).toBeDefined();
			const res = err as Response & { href?: string; to?: string };
			const location = res.headers?.get?.("Location") || res.href || res.to || (res as Record<string, unknown>).url;
			expect(location).toContain("/login");
		}
	});
});
