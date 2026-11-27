import { describe, it, expect, vi } from "vitest";
import { calcularOrcamento } from "./orcamento-calc";
import { Route as FinanceiroIndexRoute } from "../routes/financeiro.index";
import { Route as FinanceiroPrecosRoute } from "../routes/financeiro.precos";

vi.mock("#/api/auth", () => ({
	getCurrentUserServerFn: vi.fn().mockResolvedValue({ user: null }),
}));

describe("Módulo Financeiro & Engenharia de Preços G-03 (T-10 / T-11)", () => {
	it("calcula corretamente preço bruto, piso e lucro para um projeto", () => {
		const calc = calcularOrcamento({
			tempoTotalHoras: 40,
			custoHoraCentavos: 5000, // R$ 50,00/h -> Custo = R$ 2.000,00 (200000)
			precoHoraTabelaCentavos: 10000, // R$ 100,00/h -> Bruto = R$ 4.000,00 (400000)
			margemMinima: 1.5, // Piso = 200000 * 1.5 = 300000 (R$ 3.000,00)
			aliquotaImpostos: 0.06, // 6%
			bloqueioPiso: true,
		});

		expect(calc.custoProjetoCentavos).toBe(200000);
		expect(calc.pisoCentavos).toBe(300000);
		expect(calc.precoBrutoCentavos).toBe(400000);
		expect(calc.precoFinalCentavos).toBe(400000);
		expect(calc.abaixoDoPiso).toBe(false);
		expect(calc.bloqueado).toBe(false);
	});

	it("aciona bloqueio G-03 quando o desconto reduz o preço para baixo do piso", () => {
		const calc = calcularOrcamento({
			tempoTotalHoras: 40,
			custoHoraCentavos: 5000, // Custo = 200000
			precoHoraTabelaCentavos: 10000, // Bruto = 400000
			margemMinima: 1.5, // Piso = 300000
			aliquotaImpostos: 0.06,
			bloqueioPiso: true,
			descontoTipo: "VALOR",
			descontoValor: 150000, // Desconto de R$ 1.500,00 -> Preço Final = 250000 < 300000
		});

		expect(calc.precoFinalCentavos).toBe(250000);
		expect(calc.abaixoDoPiso).toBe(true);
		expect(calc.bloqueado).toBe(true);
	});

	it("protege /financeiro/ contra acesso desautenticado", async () => {
		expect(FinanceiroIndexRoute.options.beforeLoad).toBeDefined();
		try {
			await FinanceiroIndexRoute.options.beforeLoad!({
				location: { pathname: "/financeiro" } as any,
			} as any);
			expect.fail("Deveria ter redirecionado para login");
		} catch (err: unknown) {
			const res = err as Response;
			const loc =
				res.headers?.get?.("Location") || (res as Record<string, unknown>).url;
			expect(loc).toContain("/login?redirect=");
			expect(loc).toContain(encodeURIComponent("/financeiro"));
		}
	});

	it("protege /financeiro/precos contra acesso desautenticado", async () => {
		expect(FinanceiroPrecosRoute.options.beforeLoad).toBeDefined();
		try {
			await FinanceiroPrecosRoute.options.beforeLoad!({
				location: { pathname: "/financeiro/precos" } as any,
			} as any);
			expect.fail("Deveria ter redirecionado para login");
		} catch (err: unknown) {
			const res = err as Response;
			const loc =
				res.headers?.get?.("Location") || (res as Record<string, unknown>).url;
			expect(loc).toContain("/login?redirect=");
			expect(loc).toContain(encodeURIComponent("/financeiro/precos"));
		}
	});
});
