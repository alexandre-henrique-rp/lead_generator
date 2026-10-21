import { describe, expect, it } from "vitest";
import type { GarimpoServerInput } from "./aisa";

describe("Integração AIsa Server Function", () => {
	it("deve validar a tipagem de entrada para busca Apollo B2B", () => {
		const input: GarimpoServerInput = {
			motor: "APOLLO",
			tags: ["agronegocio", "tecnologia"],
			localizacaoApollo: "Ribeirão Preto, São Paulo, Brazil",
			perPage: 15,
		};

		expect(input.motor).toBe("APOLLO");
		expect(input.tags).toHaveLength(2);
		expect(input.perPage).toBe(15);
	});

	it("deve validar a tipagem de entrada para busca Google Maps Places", () => {
		const input: GarimpoServerInput = {
			motor: "GOOGLE_MAPS_PLACES",
			mapsKeyword: "clinicas ribeirao preto",
			googleLocation: "Ribeirão Preto, São Paulo, Brasil",
			googleRadius: 10000,
			googleMaxResults: 15,
		};

		expect(input.motor).toBe("GOOGLE_MAPS_PLACES");
		expect(input.mapsKeyword).toBe("clinicas ribeirao preto");
		expect(input.googleMaxResults).toBe(15);
	});
});
