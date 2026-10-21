import { describe, expect, it } from "vitest";
import {
	ESTADOS_BRASIL,
	formatarLocalizacaoApollo,
	formatarLocalizacaoDataForSeo,
	removerAcentos,
} from "./localidades";

describe("Módulo de Localidades e Conversão Canônica", () => {
	it("deve conter a lista de 27 estados do Brasil", () => {
		expect(ESTADOS_BRASIL).toHaveLength(27);
		const sp = ESTADOS_BRASIL.find((e) => e.sigla === "SP");
		expect(sp).toBeDefined();
		expect(sp?.nome).toBe("São Paulo");
	});

	it("deve remover acentuação de cidades e estados corretamente", () => {
		expect(removerAcentos("Ribeirão Preto")).toBe("Ribeirao Preto");
		expect(removerAcentos("São Paulo")).toBe("Sao Paulo");
		expect(removerAcentos("Cuiabá")).toBe("Cuiaba");
		expect(removerAcentos("Goiás")).toBe("Goias");
	});

	it("deve formatar no padrão canônico do Apollo com acento mantido", () => {
		const apolloStr = formatarLocalizacaoApollo("Ribeirão Preto", "São Paulo");
		expect(apolloStr).toBe("Ribeirão Preto, São Paulo, Brazil");

		const sertaozinhoStr = formatarLocalizacaoApollo(
			"Sertãozinho",
			"São Paulo",
		);
		expect(sertaozinhoStr).toBe("Sertãozinho, São Paulo, Brazil");
	});

	it("deve formatar no padrão canônico do DataForSEO sem acentos e com State of", () => {
		const mapsStr = formatarLocalizacaoDataForSeo(
			"Ribeirão Preto",
			"São Paulo",
		);
		expect(mapsStr).toBe("Ribeirao Preto,State of Sao Paulo,Brazil");

		const floripaStr = formatarLocalizacaoDataForSeo(
			"Florianópolis",
			"Santa Catarina",
		);
		expect(mapsStr).toBe("Ribeirao Preto,State of Sao Paulo,Brazil");
		expect(floripaStr).toBe("Florianopolis,State of Santa Catarina,Brazil");
	});
});
