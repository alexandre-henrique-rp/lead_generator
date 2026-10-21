import { describe, expect, it } from "vitest";
import {
	formatCurrencyBRL,
	formatDateBR,
	formatRelativeTime,
	parseCurrencyBRLToCents,
} from "./format";

describe("formatCurrencyBRL", () => {
	it("formata centavos para Real corretamente", () => {
		expect(formatCurrencyBRL(150000)).toMatch(/R\$\s*1\.500,00/);
		expect(formatCurrencyBRL(0)).toMatch(/R\$\s*0,00/);
		expect(formatCurrencyBRL(99)).toMatch(/R\$\s*0,99/);
		expect(formatCurrencyBRL(null)).toMatch(/R\$\s*0,00/);
	});
});

describe("parseCurrencyBRLToCents", () => {
	it("converte string em Real para centavos inteiros", () => {
		expect(parseCurrencyBRLToCents("R$ 1.500,00")).toBe(150000);
		expect(parseCurrencyBRLToCents("1500,00")).toBe(150000);
		expect(parseCurrencyBRLToCents("0,99")).toBe(99);
		expect(parseCurrencyBRLToCents("")).toBe(0);
		expect(parseCurrencyBRLToCents(null)).toBe(0);
	});
});

describe("formatDateBR", () => {
	it("formata data no padrão dd/mm/aaaa", () => {
		const data = new Date(2026, 9, 12, 14, 30);
		expect(formatDateBR(data)).toBe("12/10/2026");
		expect(formatDateBR(data, true)).toBe("12/10/2026 às 14:30");
	});

	it("retorna traço em data inválida ou nula", () => {
		expect(formatDateBR(null)).toBe("-");
		expect(formatDateBR("data_invalida")).toBe("-");
	});
});

describe("formatRelativeTime", () => {
	it("retorna tempo relativo amigável", () => {
		const agora = new Date();
		expect(formatRelativeTime(agora)).toBe("agora há pouco");

		const dezMinAtras = new Date(Date.now() - 10 * 60 * 1000);
		expect(formatRelativeTime(dezMinAtras)).toBe("há 10 min");
	});
});
