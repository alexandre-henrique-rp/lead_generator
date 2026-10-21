import { describe, expect, it } from "vitest";
import {
	contarLinhas,
	formatarTamanho,
	normalizarLinhaCsv,
	parsearCsv,
	parsearLinhaCsv,
} from "./csv";

describe("csv — parser e normalizador", () => {
	describe("parsearLinhaCsv", () => {
		it("deve parsear linha com aspas e separador ;", () => {
			const campos = parsearLinhaCsv(
				'"";VERIDIANA STEFANI;contato@profeveridiana.com;"11985191153"',
			);
			expect(campos).toEqual([
				"",
				"VERIDIANA STEFANI",
				"contato@profeveridiana.com",
				"11985191153",
			]);
		});

		it('deve suportar aspas escapadas como ""', () => {
			const campos = parsearLinhaCsv('"Maria ""Ma"" Silva";joao@x.com;"11999"');
			expect(campos).toEqual(['Maria "Ma" Silva', "joao@x.com", "11999"]);
		});

		it("deve tratar campos sem aspas", () => {
			const campos = parsearLinhaCsv("a;b;c");
			expect(campos).toEqual(["a", "b", "c"]);
		});
	});

	describe("parsearCsv", () => {
		it("deve parsear CSV completo no formato esperado", () => {
			const conteudo = [
				'"razao_social";"nome_titular";"email";"telefone"',
				'"";VERIDIANA STEFANI;contato@profeveridiana.com;"11985191153"',
				'"";EDUARDO CASARINI;eduardo@ecasarini.com;"19996660126"',
				'"";MARCIA MITUE OKANO MARQUES;Tudomaisserrana@gmail.com;"16988759403"',
			].join("\n");

			const r = parsearCsv(conteudo);

			expect(r.ok).toBe(true);
			expect(r.cabecalho).toEqual([
				"razao_social",
				"nome_titular",
				"email",
				"telefone",
			]);
			expect(r.linhas).toHaveLength(3);
			expect(r.linhas[0]).toEqual({
				linha: 2,
				razao_social: "",
				nome_titular: "VERIDIANA STEFANI",
				email: "contato@profeveridiana.com",
				telefone: "11985191153",
			});
			expect(r.erros).toHaveLength(0);
		});

		it("deve rejeitar arquivo com cabeçalho faltando colunas", () => {
			const conteudo = '"razao_social";"email"\n"x";a@b.com';
			const r = parsearCsv(conteudo);
			expect(r.ok).toBe(false);
			expect(r.erros[0]?.motivo).toContain("Faltando");
		});

		it("deve ignorar linhas vazias", () => {
			const conteudo = [
				'"razao_social";"nome_titular";"email";"telefone"',
				"",
				'"";JOAO;j@x.com;"11999"',
				"   ",
				'"";MARIA;m@x.com;"11888"',
			].join("\n");
			const r = parsearCsv(conteudo);
			expect(r.linhas).toHaveLength(2);
		});

		it("deve detectar linhas com número errado de campos", () => {
			const conteudo = [
				'"razao_social";"nome_titular";"email";"telefone"',
				'"";JOAO;j@x.com', // faltando telefone
			].join("\n");
			const r = parsearCsv(conteudo);
			expect(r.erros.length).toBeGreaterThan(0);
			expect(r.erros[0]?.motivo).toContain("campos");
		});
	});

	describe("contarLinhas", () => {
		it("deve contar linhas de dados, excluindo cabeçalho e linhas vazias", () => {
			const csv = [
				'"razao_social";"nome_titular";"email";"telefone"',
				'"";JOAO;j@x.com;"11999"',
				'"";MARIA;m@x.com;"11888"',
				"",
				'"";JOSE;jo@x.com;"11777"',
			].join("\n");
			expect(contarLinhas(csv)).toBe(3);
		});

		it("deve retornar 0 quando só tem cabeçalho", () => {
			expect(contarLinhas('"a";"b";"c";"d"')).toBe(0);
		});

		it("deve retornar 0 para CSV vazio", () => {
			expect(contarLinhas("")).toBe(0);
			expect(contarLinhas("   \n  \n")).toBe(0);
		});

		it("deve aceitar \\r\\n (Windows)", () => {
			const csv = '"a";"b"\r\n"1";"2"\r\n"3";"4"';
			expect(contarLinhas(csv)).toBe(2);
		});
	});

	describe("formatarTamanho", () => {
		it("deve formatar bytes", () => {
			expect(formatarTamanho(0)).toBe("0 B");
			expect(formatarTamanho(512)).toBe("512 B");
			expect(formatarTamanho(1023)).toBe("1023 B");
		});

		it("deve formatar KB", () => {
			expect(formatarTamanho(1024)).toBe("1.0 KB");
			expect(formatarTamanho(2048)).toBe("2.0 KB");
			expect(formatarTamanho(1536)).toBe("1.5 KB");
		});

		it("deve formatar MB", () => {
			expect(formatarTamanho(1024 * 1024)).toBe("1.00 MB");
			expect(formatarTamanho(5 * 1024 * 1024)).toBe("5.00 MB");
		});

		it("deve formatar GB", () => {
			expect(formatarTamanho(1024 * 1024 * 1024)).toBe("1.00 GB");
		});
	});

	describe("normalizarLinhaCsv", () => {
		it("deve normalizar com nome_titular e telefone", () => {
			const r = normalizarLinhaCsv({
				linha: 2,
				razao_social: "",
				nome_titular: "JOAO SILVA",
				email: "joao@x.com",
				telefone: "(16) 9999-0011",
			});
			expect(r.nome).toBe("JOAO SILVA");
			expect(r.telefone).toBe("(16) 9999-0011");
			expect(r.telefoneNorm).toBe("1699990011");
			expect(r.email).toBe("joao@x.com");
		});

		it("deve descartar e-mail inválido", () => {
			const r = normalizarLinhaCsv({
				linha: 2,
				razao_social: "",
				nome_titular: "JOAO",
				email: "isto-nao-é-email",
				telefone: "",
			});
			expect(r.email).toBeNull();
		});

		it("deve usar razao_social como fallback do nome", () => {
			const r = normalizarLinhaCsv({
				linha: 2,
				razao_social: "Empresa XPTO Ltda",
				nome_titular: "",
				email: "",
				telefone: "",
			});
			expect(r.nome).toBe("Empresa XPTO Ltda");
			expect(r.razaoSocial).toBe("Empresa XPTO Ltda");
		});

		it("deve retornar (sem nome) quando tudo vazio", () => {
			const r = normalizarLinhaCsv({
				linha: 2,
				razao_social: "",
				nome_titular: "",
				email: "",
				telefone: "",
			});
			expect(r.nome).toBe("(sem nome)");
		});
	});
});
