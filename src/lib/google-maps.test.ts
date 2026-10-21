import { describe, expect, it } from "vitest";
import {
	buildGooglePlaceDetailsUrl,
	buildGooglePlacesTextSearchUrl,
	normalizarGooglePlace,
} from "./google-maps";

describe("Integração Google Maps Places - Normalização e Construtores de URL", () => {
	const API_KEY = "AIza-fake-key-for-tests";

	describe("buildGooglePlacesTextSearchUrl", () => {
		it("deve montar URL com query, language e region padrão", () => {
			const url = buildGooglePlacesTextSearchUrl(
				{ query: "clinicas em Ribeirão Preto" },
				API_KEY,
			);
			expect(url).toContain(
				"https://maps.googleapis.com/maps/api/place/textsearch/json",
			);
			expect(url).toContain("query=clinicas+em+Ribeir%C3%A3o+Preto");
			expect(url).toContain("language=pt-BR");
			expect(url).toContain("region=br");
			expect(url).toContain(`key=${API_KEY}`);
		});

		it("deve aceitar centerLatLng + radius para bias geográfico", () => {
			const url = buildGooglePlacesTextSearchUrl(
				{
					query: "padarias",
					centerLatLng: "-21.1784,-47.8103",
					radius: 5000,
				},
				API_KEY,
			);
			expect(url).toContain("location=-21.1784%2C-47.8103");
			expect(url).toContain("radius=5000");
		});

		it("deve permitir custom language e region", () => {
			const url = buildGooglePlacesTextSearchUrl(
				{ query: "restaurants", language: "en", region: "us" },
				API_KEY,
			);
			expect(url).toContain("language=en");
			expect(url).toContain("region=us");
		});
	});

	describe("buildGooglePlaceDetailsUrl", () => {
		it("deve montar URL com placeId e campos default", () => {
			const url = buildGooglePlaceDetailsUrl({ placeId: "ChIJ123" }, API_KEY);
			expect(url).toContain(
				"https://maps.googleapis.com/maps/api/place/details/json",
			);
			expect(url).toContain("place_id=ChIJ123");
			expect(url).toContain(
				"fields=name%2Cformatted_address%2Cformatted_phone_number",
			);
			expect(url).toContain("website");
			expect(url).toContain(`key=${API_KEY}`);
		});

		it("deve aceitar fields custom", () => {
			const url = buildGooglePlaceDetailsUrl(
				{ placeId: "ChIJ456", fields: ["name", "rating", "opening_hours"] },
				API_KEY,
			);
			expect(url).toContain("fields=name%2Crating%2Copening_hours");
		});
	});

	describe("normalizarGooglePlace", () => {
		it("deve normalizar um place do Google com telefone e website", () => {
			const place = {
				place_id: "ChIJ_real_place_id",
				name: "Clínica Vida Ribeirão",
				formatted_address:
					"Rua das Flores, 123 - Centro, Ribeirão Preto, SP, Brasil",
				formatted_phone_number: "(16) 3610-8899",
				international_phone_number: "+55 16 3610-8899",
				website: "https://www.clinicavida.com.br",
				rating: 4.8,
				user_ratings_total: 213,
				types: ["doctor", "health"],
			};

			const lead = normalizarGooglePlace(place, 0);

			expect(lead.id).toContain("gmaps-ChIJ_real_place_id");
			expect(lead.nome).toBe("Clínica Vida Ribeirão");
			expect(lead.telefone).toBe("(16) 3610-8899");
			expect(lead.temTelefone).toBe(true);
			expect(lead.dominio).toBe("clinicavida.com.br");
			expect(lead.rating).toBe(4.8);
			expect(lead.reviewsCount).toBe(213);
			expect(lead.setor).toBe("Clínica Médica"); // doctor → legível
			expect(lead.cidade).toBe("Ribeirão Preto");
			expect(lead.estado).toBe("SP");
			expect(lead.motor).toBe("GOOGLE_MAPS_PLACES");
			expect(lead.selected).toBe(true);
		});

		it("deve marcar temTelefone=false para place sem telefone", () => {
			const place = {
				place_id: "ChIJ_no_phone",
				name: "Loja sem telefone",
				formatted_address: "Av. Brasil, 1000, Ribeirão Preto, SP, Brasil",
				types: ["store"],
			};

			const lead = normalizarGooglePlace(place, 0);

			expect(lead.telefone).toBeUndefined();
			expect(lead.temTelefone).toBe(false);
			expect(lead.selected).toBe(false);
		});

		it("deve tratar telefone internacional sem formatação", () => {
			const place = {
				place_id: "ChIJ_intl",
				name: "Restaurante SP",
				international_phone_number: "+5516987654321",
				formatted_address: "Rua X, 100, São Paulo, SP, Brasil",
			};
			const lead = normalizarGooglePlace(place, 0);
			expect(lead.telefone).toBe("+5516987654321");
			expect(lead.temTelefone).toBe(true);
		});

		it("deve extrair domínio de website sem protocolo", () => {
			const place = {
				place_id: "ChIJ_site",
				name: "Padaria",
				website: "padariaexemplo.com.br",
				types: ["bakery"],
			};
			const lead = normalizarGooglePlace(place, 0);
			expect(lead.dominio).toBe("padariaexemplo.com.br");
			expect(lead.setor).toBe("Padaria");
		});

		it("deve usar fallback de cidade/estado quando endereço não tem padrão BR", () => {
			const place = {
				place_id: "ChIJ_fb",
				name: "Estabelecimento X",
				formatted_address: "Some address without state pattern",
			};
			const lead = normalizarGooglePlace(place, 0, "Curitiba", "PR");
			expect(lead.cidade).toBe("Curitiba");
			expect(lead.estado).toBe("PR");
		});

		it("deve retornar rating e reviewsCount undefined quando ausentes", () => {
			const place = {
				place_id: "ChIJ_no_rating",
				name: "Estabelecimento sem rating",
			};
			const lead = normalizarGooglePlace(place, 0);
			expect(lead.rating).toBeUndefined();
			expect(lead.reviewsCount).toBeUndefined();
		});
	});
});
