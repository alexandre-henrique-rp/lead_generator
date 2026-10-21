import { describe, expect, it } from "vitest";
import {
	escolherDecisorDono,
	escolherSocioPrincipal,
	primeiroNomeDe,
	type SocioQsa,
} from "./socio";

const socio = (over: Partial<SocioQsa> & { nomeSocio: string }): SocioQsa => ({
	qualificacaoSocio: null,
	percentualCapital: null,
	ordem: 0,
	cnpjCpfDoSocio: "***112108**",
	...over,
});

describe("escolherSocioPrincipal", () => {
	it("escolhe o sócio-administrador mesmo com outro antes na ordem", () => {
		const resultado = escolherSocioPrincipal([
			socio({ nomeSocio: "Fulano Beltrano", qualificacaoSocio: "Sócio" }),
			socio({
				nomeSocio: "JOSE NUNES PAEZ DE PROENCA JUNIOR",
				qualificacaoSocio: "Sócio-Administrador",
				ordem: 1,
			}),
		]);
		expect(resultado?.primeiroNome).toBe("José");
		expect(resultado?.qualificacao).toBe("Sócio-Administrador");
	});

	it("descarta sócio que é PESSOA JURÍDICA (nome de empresa)", () => {
		const resultado = escolherSocioPrincipal([
			socio({
				nomeSocio: "ZOPONE ENGENHARIA E COMERCIO LTDA",
				qualificacaoSocio: "Sócio",
				ordem: 0,
			}),
			socio({
				nomeSocio: "CLAUDIO ZOPONE",
				qualificacaoSocio: "Administrador",
				ordem: 1,
			}),
		]);
		expect(resultado?.primeiroNome).toBe("Cláudio");
		expect(resultado?.nome).toBe("CLAUDIO ZOPONE");
	});

	it("descarta registro com CNPJ sem máscara (pessoa jurídica)", () => {
		const resultado = escolherSocioPrincipal([
			socio({
				nomeSocio: "RGO - INCORPORACOES E CONSTRUCOES LTDA.",
				qualificacaoSocio: "Sócio",
				cnpjCpfDoSocio: "59225698",
			}),
		]);
		expect(resultado).toBeNull();
	});

	it("usa percentual de capital antes da ordem de cadastro", () => {
		const resultado = escolherSocioPrincipal([
			socio({
				nomeSocio: "PRIMEIRO SOCIO",
				qualificacaoSocio: "Sócio",
				ordem: 0,
				percentualCapital: 20,
			}),
			socio({
				nomeSocio: "MAIOR SOCIO",
				qualificacaoSocio: "Sócio",
				ordem: 1,
				percentualCapital: 80,
			}),
		]);
		expect(resultado?.nome).toBe("MAIOR SOCIO");
	});

	it("prioriza administrador sobre sócio e presidente", () => {
		const resultado = escolherSocioPrincipal([
			socio({
				nomeSocio: "PRESIDENTE DA CIA",
				qualificacaoSocio: "Presidente",
			}),
			socio({
				nomeSocio: "ADMINISTRADOR",
				qualificacaoSocio: "Administrador",
				ordem: 1,
			}),
		]);
		expect(resultado?.nome).toBe("ADMINISTRADOR");
	});

	it("devolve null quando não há ninguém (QSA vazio)", () => {
		expect(escolherSocioPrincipal([])).toBeNull();
		expect(escolherSocioPrincipal(null)).toBeNull();
	});
});

describe("escolherDecisorDono (fallback da pesquisa)", () => {
	it("usa o decisor com cargo de dono", () => {
		const resultado = escolherDecisorDono([
			{ nome: "Daisa dos Reis Riboli Rodrigues", cargo: "Proprietária/ME" },
		]);
		expect(resultado?.primeiroNome).toBe("Daisa");
	});

	it("NÃO usa CEO/diretor/gerente (não é o dono)", () => {
		expect(
			escolherDecisorDono([{ nome: "Fabrício Chaves", cargo: "CEO" }]),
		).toBeNull();
		expect(
			escolherDecisorDono([{ nome: "Alguem", cargo: "Diretor de Operações" }]),
		).toBeNull();
	});

	it("usa o primeiro decisor-dono da lista", () => {
		const resultado = escolherDecisorDono([
			{ nome: "Conselheiro Qualquer", cargo: "Conselheiro de Administração" },
			{
				nome: "Idamar Lourenço de Oliveira",
				cargo: "Provável Proprietário/Administrador",
			},
		]);
		expect(resultado?.primeiroNome).toBe("Idamar");
	});

	it("ignora decisor sem cargo", () => {
		expect(escolherDecisorDono([{ nome: "Fulano", cargo: null }])).toBeNull();
	});
});

describe("primeiroNomeDe", () => {
	it("pega o primeiro nome e acentua", () => {
		expect(primeiroNomeDe("JOSE NUNES PAEZ DE PROENCA JUNIOR")).toBe("José");
		expect(primeiroNomeDe("MARIA APARECIDA SILVA")).toBe("Maria");
		expect(primeiroNomeDe("FABRICIO SANTOS MOREIRA CHAVES")).toBe("Fabrício");
	});

	it("ignora partícula no meio do nome", () => {
		expect(primeiroNomeDe("JOAO DE SOUZA CARLOS")).toBe("João");
	});

	it("preserva o primeiro nome já acentuado", () => {
		expect(primeiroNomeDe("Adriano Viana Ribeiro Soares")).toBe("Adriano");
		expect(primeiroNomeDe("Daisa dos Reis Riboli Rodrigues")).toBe("Daisa");
	});
});
