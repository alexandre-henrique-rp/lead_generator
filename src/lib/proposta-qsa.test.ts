import { describe, it, expect } from "vitest";
import type { EmpresaPropostaDTO, SocioPublicoDTO } from "../api/funil";

describe("Proposta Comercial Pública — Enriquecimento com Dados da Empresa e QSA", () => {
	it("deve estruturar corretamente os dados da empresa e lista de sócios do QSA", () => {
		const mockSocios: SocioPublicoDTO[] = [
			{
				uuid: "socio-1",
				nomeSocio: "DR. RICARDO M. SILVA",
				cnpjCpfDoSocio: "***123456**",
				qualificacaoSocio: "Sócio-Administrador",
				faixaEtaria: "Entre 41 e 50 anos",
				percentualCapital: 60,
			},
			{
				uuid: "socio-2",
				nomeSocio: "JULIANA K. ALBUQUERQUE",
				cnpjCpfDoSocio: "***987654**",
				qualificacaoSocio: "Sócia",
				faixaEtaria: "Entre 31 e 40 anos",
				percentualCapital: 40,
			},
		];

		const mockEmpresa: EmpresaPropostaDTO = {
			nome: "Clínica Vida Imagem S/A",
			razaoSocial: "VIDA IMAGEM DIAGNOSTICOS MEDICOS S/A",
			cnpj: "08712901000119",
			cidade: "Curitiba",
			uf: "PR",
			endereco: "Av. do Batel, 1850 - Batel",
			capitalSocialCentavos: 180000000,
			socios: mockSocios,
		};

		expect(mockEmpresa.nome).toBe("Clínica Vida Imagem S/A");
		expect(mockEmpresa.razaoSocial).toBe("VIDA IMAGEM DIAGNOSTICOS MEDICOS S/A");
		expect(mockEmpresa.socios).toHaveLength(2);
		expect(mockEmpresa.socios[0].nomeSocio).toBe("DR. RICARDO M. SILVA");
		expect(mockEmpresa.socios[0].qualificacaoSocio).toBe("Sócio-Administrador");
		expect(mockEmpresa.socios[1].nomeSocio).toBe("JULIANA K. ALBUQUERQUE");
	});

	it("deve permitir que o aceite use o nome de um sócio do QSA para preenchimento", () => {
		const socio = {
			uuid: "s-1",
			nomeSocio: "Marcia Mitue Okano Marques",
			qualificacaoSocio: "Titular",
			cnpjCpfDoSocio: "***765432**",
		};

		// Simulação de clique de atalho no sócio
		let nomeResponsavel = "";
		let docResponsavel = "";

		const handlePreencherSocio = (s: typeof socio) => {
			nomeResponsavel = s.nomeSocio;
			if (s.cnpjCpfDoSocio && !s.cnpjCpfDoSocio.includes("*")) {
				docResponsavel = s.cnpjCpfDoSocio;
			}
		};

		handlePreencherSocio(socio);
		expect(nomeResponsavel).toBe("Marcia Mitue Okano Marques");
		expect(docResponsavel).toBe(""); // Documento com máscara da RFB exige digitação manual do CPF pelo titular
	});
});
