import { describe, it, expect } from "vitest";
import {
	COLUNAS_KANBAN,
	mapearEtapaParaColuna,
	agruparLeadsNoKanban,
	type KanbanLeadCard,
} from "./kanban-funil";

describe("Kanban do Funil de Vendas — Lógica de Agrupamento (T-04 / AC-04.1 e AC-04.2)", () => {
	it("possui exatamente 6 colunas canônicas", () => {
		expect(COLUNAS_KANBAN).toHaveLength(6);
		const keys = COLUNAS_KANBAN.map((c) => c.key);
		expect(keys).toEqual([
			"NOVO",
			"CONTATADO",
			"QUALIFICADO",
			"PROPOSTA",
			"NEGOCIACAO",
			"FECHADO",
		]);
	});

	it("mapeia etapas corretamente para as colunas", () => {
		expect(mapearEtapaParaColuna("NOVO")).toBe("NOVO");
		expect(mapearEtapaParaColuna("novo")).toBe("NOVO");
		expect(mapearEtapaParaColuna("CONTATADO")).toBe("CONTATADO");
		expect(mapearEtapaParaColuna("DIAGNOSTICO")).toBe("QUALIFICADO");
		expect(mapearEtapaParaColuna("QUALIFICADO")).toBe("QUALIFICADO");
		expect(mapearEtapaParaColuna("PROPOSTA")).toBe("PROPOSTA");
		expect(mapearEtapaParaColuna("PROPOSTA_ENVIADA")).toBe("PROPOSTA");
		expect(mapearEtapaParaColuna("NEGOCIACAO")).toBe("NEGOCIACAO");
		expect(mapearEtapaParaColuna("NEGOCIANDO")).toBe("NEGOCIACAO");
		expect(mapearEtapaParaColuna("GANHO")).toBe("FECHADO");
		expect(mapearEtapaParaColuna("PERDIDO")).toBe("FECHADO");
		expect(mapearEtapaParaColuna("FECHADO_GANHO")).toBe("FECHADO");
		expect(mapearEtapaParaColuna("FECHADO_PERDIDO")).toBe("FECHADO");
		expect(mapearEtapaParaColuna("DESCONHECIDO")).toBe("NOVO");
	});

	it("agrupa leads e calcula somatório financeiro em centavos com precisão", () => {
		const mockLeads: KanbanLeadCard[] = [
			{
				id: "lead-1",
				nome: "Clínica Vida Imagem S/A",
				etapa: "QUALIFICADO",
				telefone: "41999998888",
				temWhatsapp: true,
				valorEstimadoCentavos: 4490000, // R$ 44.900,00
				horasEstimadas: 320,
				createdAt: "2026-10-25T10:00:00Z",
				origem: "MAPS",
			},
			{
				id: "lead-2",
				nome: "Hospital São Lucas",
				etapa: "DIAGNOSTICO",
				telefone: "4133332222",
				temWhatsapp: false,
				valorEstimadoCentavos: 5500000, // R$ 55.000,00
				horasEstimadas: 400,
				createdAt: "2026-10-26T14:00:00Z",
				origem: "CSV",
			},
			{
				id: "lead-3",
				nome: "Laboratório Santa Maria",
				etapa: "NOVO",
				telefone: "41988887777",
				temWhatsapp: true,
				valorEstimadoCentavos: 2500000, // R$ 25.000,00
				horasEstimadas: 160,
				createdAt: "2026-10-27T09:00:00Z",
				origem: "MANUAL",
			},
			{
				id: "lead-4",
				nome: "Centro Médico Curitiba",
				etapa: "GANHO",
				telefone: "41977776666",
				temWhatsapp: true,
				valorEstimadoCentavos: 3800000,
				horasEstimadas: 240,
				createdAt: "2026-10-20T11:00:00Z",
				origem: "MAPS",
			},
		];

		const agrupado = agruparLeadsNoKanban(mockLeads);

		// Coluna NOVO
		expect(agrupado.NOVO.quantidade).toBe(1);
		expect(agrupado.NOVO.totalValorCentavos).toBe(2500000);
		expect(agrupado.NOVO.leads[0].nome).toBe("Laboratório Santa Maria");

		// Coluna QUALIFICADO (contém QUALIFICADO e DIAGNOSTICO)
		expect(agrupado.QUALIFICADO.quantidade).toBe(2);
		expect(agrupado.QUALIFICADO.totalValorCentavos).toBe(4490000 + 5500000);

		// Coluna FECHADO (contém GANHO)
		expect(agrupado.FECHADO.quantidade).toBe(1);
		expect(agrupado.FECHADO.totalValorCentavos).toBe(3800000);

		// Colunas vazias
		expect(agrupado.CONTATADO.quantidade).toBe(0);
		expect(agrupado.CONTATADO.totalValorCentavos).toBe(0);
		expect(agrupado.PROPOSTA.quantidade).toBe(0);
		expect(agrupado.NEGOCIACAO.quantidade).toBe(0);
	});
});
