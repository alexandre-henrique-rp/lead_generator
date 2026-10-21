import { describe, expect, it } from "vitest";
import {
	calcularTempoAtividade,
	estimarPorteEFaturamento,
	formatarMoedaBrl,
	inferirWebsiteDeEmail,
} from "./empresa-porte";

describe("empresa-porte", () => {
	it("deve estimar dados para MEI", () => {
		const info = estimarPorteEFaturamento("MEI", null, true);
		expect(info.categoria).toBe("MEI");
		expect(info.label).toContain("Microempreendedor Individual");
		expect(info.faturamentoPresumido).toContain("81.000");
	});

	it("deve estimar dados para Microempresa (ME)", () => {
		const info = estimarPorteEFaturamento("MICRO EMPRESA", true, false);
		expect(info.categoria).toBe("ME");
		expect(info.label).toContain("Microempresa");
		expect(info.faturamentoPresumido).toContain("360.000");
	});

	it("deve estimar dados para Empresa de Pequeno Porte (EPP)", () => {
		const info = estimarPorteEFaturamento("EPP", true, false);
		expect(info.categoria).toBe("EPP");
		expect(info.label).toContain("Empresa de Pequeno Porte");
	});

	it("deve estimar dados para DEMAIS (médio/grande porte)", () => {
		const info = estimarPorteEFaturamento("DEMAIS", false, false);
		expect(info.categoria).toBe("DEMAIS");
		expect(info.estimativaFuncionarios).toBe("50+ colaboradores");
	});

	it("deve inferir website corporativo e ignorar domínios públicos", () => {
		expect(inferirWebsiteDeEmail("contato@empresa.com.br")).toBe(
			"https://empresa.com.br",
		);
		expect(inferirWebsiteDeEmail("financeiro@ok.org.br")).toBe(
			"https://ok.org.br",
		);
		expect(inferirWebsiteDeEmail("fulano@gmail.com")).toBeNull();
		expect(inferirWebsiteDeEmail("empresa@hotmail.com")).toBeNull();
		expect(inferirWebsiteDeEmail(null)).toBeNull();
	});

	it("deve formatar valor monetário em BRL", () => {
		const formatted = formatarMoedaBrl(100000);
		expect(formatted).toContain("100.000,00");
		expect(formatarMoedaBrl(0)).toContain("0,00");
		expect(formatarMoedaBrl(null)).toContain("0,00");
	});

	it("deve calcular tempo de atividade empresarial", () => {
		const tempo = calcularTempoAtividade("2013-10-03");
		expect(tempo).toBeDefined();
		expect(typeof tempo).toBe("string");
		expect(calcularTempoAtividade(null)).toBeNull();
	});
});
