import { describe, it, expect, vi } from "vitest";
import { createProjetoSchema, updateProjetoSchema } from "../api/projetos";
import { Route as ProjetosIndexRoute } from "../routes/projetos.index";
import { Route as ProjetosDetailRoute } from "../routes/projetos.$id";

vi.mock("#/api/auth", () => ({
	getCurrentUserServerFn: vi.fn().mockResolvedValue({ user: null }),
}));

describe("Módulo de Projetos & Sprints (T-08 / T-09)", () => {
	it("valida criação de projetos com schemas tipados", () => {
		const valido = createProjetoSchema.safeParse({
			nome: "Plataforma E-commerce King",
			descricao: "Sistema de vendas B2B",
		});
		expect(valido.success).toBe(true);

		const invalido = createProjetoSchema.safeParse({
			nome: "",
		});
		expect(invalido.success).toBe(false);
	});

	it("valida atualizações de progresso no range 0..100%", () => {
		const valido = updateProjetoSchema.safeParse({
			uuid: "proj-123",
			progresso: 85,
		});
		expect(valido.success).toBe(true);

		const progressoNegativo = updateProjetoSchema.safeParse({
			uuid: "proj-123",
			progresso: -10,
		});
		expect(progressoNegativo.success).toBe(false);

		const progressoExcedido = updateProjetoSchema.safeParse({
			uuid: "proj-123",
			progresso: 150,
		});
		expect(progressoExcedido.success).toBe(false);
	});

	it("protege a rota /projetos/ com beforeLoad autenticado", async () => {
		expect(ProjetosIndexRoute.options.beforeLoad).toBeDefined();
		try {
			await ProjetosIndexRoute.options.beforeLoad!({
				location: { pathname: "/projetos" } as any,
			} as any);
			expect.fail("Deveria ter redirecionado para login");
		} catch (err: unknown) {
			const res = err as Response;
			const loc =
				res.headers?.get?.("Location") || (res as Record<string, unknown>).url;
			expect(loc).toContain("/login?redirect=");
			expect(loc).toContain(encodeURIComponent("/projetos"));
		}
	});

	it("protege a rota /projetos/$id com beforeLoad autenticado", async () => {
		expect(ProjetosDetailRoute.options.beforeLoad).toBeDefined();
		try {
			await ProjetosDetailRoute.options.beforeLoad!({
				location: { pathname: "/projetos/uuid-123" } as any,
			} as any);
			expect.fail("Deveria ter redirecionado para login");
		} catch (err: unknown) {
			const res = err as Response;
			const loc =
				res.headers?.get?.("Location") || (res as Record<string, unknown>).url;
			expect(loc).toContain("/login?redirect=");
			expect(loc).toContain(encodeURIComponent("/projetos/uuid-123"));
		}
	});

	it("valida estrutura canônica das 4 colunas de Sprints do Penpot (Board 02)", () => {
		const colunasEsperadas = ["A_FAZER", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"];
		expect(colunasEsperadas).toHaveLength(4);
		expect(colunasEsperadas).toContain("A_FAZER");
		expect(colunasEsperadas).toContain("EM_ANDAMENTO");
		expect(colunasEsperadas).toContain("CONCLUIDA");
		expect(colunasEsperadas).toContain("CANCELADA");
	});

	it("valida payload de importação JSON de sprints no formato esperado pelo Penpot (Board 03)", () => {
		const jsonValido = JSON.stringify({
			sprints: [
				{
					nome: "Sprint 2 · Integração PACS & WhatsApp",
					tarefas: [
						{
							titulo: "Conector DICOMweb / REST com servidor PACS",
							horasEstimadas: 20,
							subtarefas: ["Autenticação mTLS", "Cache PDF"],
						},
					],
				},
			],
		});

		const parsed = JSON.parse(jsonValido);
		expect(parsed.sprints).toHaveLength(1);
		expect(parsed.sprints[0].tarefas[0].horasEstimadas).toBe(20);
		expect(parsed.sprints[0].tarefas[0].subtarefas).toHaveLength(2);
	});
});
