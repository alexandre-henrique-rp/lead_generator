import { describe, expect, it } from "vitest";
import { calcularOrcamento } from "./orcamento-calc";

// Defaults do PriceConfig (ver schema.prisma / 12-price-config.md):
// custoHora = 6059 (R$60,59), precoHoraTabela = 9500 (R$95,00),
// margem = 1.5, aliquota = 0.06, bloqueioPiso = true.
const base = {
	custoHoraCentavos: 6059,
	precoHoraTabelaCentavos: 9500,
	margemMinima: 1.5,
	aliquotaImpostos: 0.06,
	bloqueioPiso: true,
};

describe("calcularOrcamento", () => {
	it("calcula custo, piso, preço bruto e lucro para 80h sem desconto", () => {
		const r = calcularOrcamento({ ...base, tempoTotalHoras: 80 });
		// custo = 80 * 6059 = 484720
		expect(r.custoProjetoCentavos).toBe(484720);
		// piso = 484720 * 1.5 = 727080  (G-02)
		expect(r.pisoCentavos).toBe(727080);
		// preco bruto = 80 * 9500 = 760000
		expect(r.precoBrutoCentavos).toBe(760000);
		expect(r.descontoAplicadoCentavos).toBe(0);
		expect(r.precoFinalCentavos).toBe(760000);
		// imposto = 760000 * 0.06 = 45600
		expect(r.impostoEstimadoCentavos).toBe(45600);
		// lucro = 760000 - 484720 - 45600 = 229680
		expect(r.lucroEstimadoCentavos).toBe(229680);
		// 760000 >= piso 727080 → não está abaixo
		expect(r.abaixoDoPiso).toBe(false);
		expect(r.bloqueado).toBe(false);
	});

	it("aplica desconto percentual", () => {
		const r = calcularOrcamento({
			...base,
			tempoTotalHoras: 80,
			descontoTipo: "PERCENTUAL",
			descontoValor: 10,
		});
		// desconto = 760000 * 10% = 76000 → final = 684000
		expect(r.descontoAplicadoCentavos).toBe(76000);
		expect(r.precoFinalCentavos).toBe(684000);
		// 684000 < piso 727080 → abaixo do piso e bloqueado (G-03)
		expect(r.abaixoDoPiso).toBe(true);
		expect(r.bloqueado).toBe(true);
	});

	it("aplica desconto em valor fixo", () => {
		const r = calcularOrcamento({
			...base,
			tempoTotalHoras: 80,
			descontoTipo: "VALOR",
			descontoValor: 30000,
		});
		expect(r.descontoAplicadoCentavos).toBe(30000);
		expect(r.precoFinalCentavos).toBe(730000);
		expect(r.abaixoDoPiso).toBe(false);
		expect(r.bloqueado).toBe(false);
	});

	it("não bloqueia quando bloqueioPiso é false, mas sinaliza abaixoDoPiso", () => {
		const r = calcularOrcamento({
			...base,
			bloqueioPiso: false,
			tempoTotalHoras: 80,
			descontoTipo: "PERCENTUAL",
			descontoValor: 50,
		});
		expect(r.abaixoDoPiso).toBe(true);
		expect(r.bloqueado).toBe(false);
	});

	it("não deixa desconto passar do preço bruto nem preço final negativo", () => {
		const r = calcularOrcamento({
			...base,
			tempoTotalHoras: 10,
			descontoTipo: "VALOR",
			descontoValor: 999999999,
		});
		expect(r.precoFinalCentavos).toBe(0);
		expect(r.descontoAplicadoCentavos).toBe(r.precoBrutoCentavos);
	});

	it("zera tudo com 0 horas", () => {
		const r = calcularOrcamento({ ...base, tempoTotalHoras: 0 });
		expect(r.custoProjetoCentavos).toBe(0);
		expect(r.pisoCentavos).toBe(0);
		expect(r.precoBrutoCentavos).toBe(0);
		expect(r.precoFinalCentavos).toBe(0);
	});
});
