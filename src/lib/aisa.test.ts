import { describe, expect, it } from "vitest";
import { buildApolloPayload, normalizarApolloOrganizacao } from "./aisa";

describe("Integração AIsa - Apollo (B2B)", () => {
	it("deve montar o payload do Apollo com array de tags e localização canônica", () => {
		const payload = buildApolloPayload({
			palavrasChave: ["agronegocio", "tecnologia"],
			localizacao: "Ribeirão Preto, São Paulo, Brazil",
			page: 1,
			perPage: 15,
		});

		expect(payload).toEqual({
			q_organization_keyword_tags: ["agronegocio", "tecnologia"],
			organization_locations: ["Ribeirão Preto, São Paulo, Brazil"],
			page: 1,
			per_page: 15,
		});
	});

	it("deve permitir busca no Apollo sem tags (somente por localização)", () => {
		const payload = buildApolloPayload({
			palavrasChave: [],
			localizacao: "Ribeirão Preto, São Paulo, Brazil",
		});

		expect(payload).toEqual({
			organization_locations: ["Ribeirão Preto, São Paulo, Brazil"],
			page: 1,
			per_page: 15,
		});
		expect(payload.q_organization_keyword_tags).toBeUndefined();
	});

	it("deve normalizar os dados retornados de uma organização do Apollo", () => {
		const rawApolloOrg = {
			id: "org_12345",
			name: "AgroTech Brasil Ltda",
			legal_name: "AgroTech Brasil Inovações SA",
			primary_domain: "agrotechbrasil.com.br",
			phone: "+55 16 3999-0011",
			raw_address: "Av. Maurílio Biagi, 1000 - Ribeirão Preto, SP",
			city: "Ribeirão Preto",
			state: "SP",
			industry: "Agronegócio & Software",
			estimated_num_employees: 45,
		};

		const lead = normalizarApolloOrganizacao(rawApolloOrg, 0);

		expect(lead.nome).toBe("AgroTech Brasil Ltda");
		expect(lead.dominio).toBe("agrotechbrasil.com.br");
		expect(lead.telefone).toBe("+55 16 3999-0011");
		expect(lead.temTelefone).toBe(true);
		expect(lead.motor).toBe("APOLLO");
		expect(lead.porteFuncionarios).toBe("45 funcionários");
		expect(lead.selected).toBe(true);
	});
});
