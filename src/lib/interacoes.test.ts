import { describe, expect, it } from "vitest";
import { TIPOS_INTERACAO, type TipoInteracao } from "#/api/interacoes";

describe("API de Interações de Lead", () => {
	it("deve conter todos os tipos necessários para a Ficha 360 do Penpot", () => {
		expect(TIPOS_INTERACAO).toContain("WHATSAPP");
		expect(TIPOS_INTERACAO).toContain("LIGACAO");
		expect(TIPOS_INTERACAO).toContain("REUNIAO");
		expect(TIPOS_INTERACAO).toContain("PESQUISA_IA");
		expect(TIPOS_INTERACAO).toContain("BRASILAPI");
		expect(TIPOS_INTERACAO).toContain("NOTA");
	});

	it("deve permitir tipagem estrita de TipoInteracao", () => {
		const tipoBrasilApi: TipoInteracao = "BRASILAPI";
		const tipoPesquisaIa: TipoInteracao = "PESQUISA_IA";
		const tipoReuniao: TipoInteracao = "REUNIAO";

		expect(tipoBrasilApi).toBe("BRASILAPI");
		expect(tipoPesquisaIa).toBe("PESQUISA_IA");
		expect(tipoReuniao).toBe("REUNIAO");
	});
});
