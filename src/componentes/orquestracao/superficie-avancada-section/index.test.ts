import { describe, expect, it } from "vitest";
import {
	calcularTempoAtividade,
	estimarPorteEFaturamento,
	formatarMoedaBrl,
} from "#/lib/empresa-porte";

describe("Superfície Avançada — Dados RFB & QSA (Regras e Cálculos)", () => {
	it("calcula corretamente os KPIs de porte e faturamento presumido para ME com Simples", () => {
		const info = estimarPorteEFaturamento("MICRO EMPRESA", true, false);
		expect(info.label).toContain("Microempresa");
		expect(info.faturamentoPresumido).toContain("360.000");
		expect(info.estimativaFuncionarios).toBeDefined();
	});

	it("calcula faturamento para MEI", () => {
		const info = estimarPorteEFaturamento("MEI", null, true);
		expect(info.label).toContain("Microempreendedor Individual");
		expect(info.faturamentoPresumido).toContain("81.000");
	});

	it("formata capital social em reais a partir de centavos ou valor decimal", () => {
		expect(formatarMoedaBrl(100000)).toContain("100.000,00");
		expect(formatarMoedaBrl(0)).toContain("0,00");
	});

	it("calcula tempo de atividade em anos a partir da data de abertura", () => {
		const dataAberturaPassada = "2020-01-01";
		const tempo = calcularTempoAtividade(dataAberturaPassada);
		expect(tempo).toBeDefined();
		expect(typeof tempo).toBe("string");
		expect(tempo).toContain("ano");
	});
});
