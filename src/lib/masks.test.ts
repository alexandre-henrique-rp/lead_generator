import { describe, expect, it } from "vitest";
import {
	isValidCnpj,
	isValidCpf,
	maskCep,
	maskCpfCnpj,
	maskPhone,
	onlyDigits,
} from "./masks";

describe("onlyDigits", () => {
	it("remove qualquer caractere não dígito", () => {
		expect(onlyDigits("123.456.789-00")).toBe("12345678900");
		expect(onlyDigits("(16) 99602-9107")).toBe("16996029107");
		expect(onlyDigits("")).toBe("");
	});
});

describe("maskCpfCnpj", () => {
	it("aplica máscara de CPF para até 11 dígitos", () => {
		expect(maskCpfCnpj("12345678901")).toBe("123.456.789-01");
	});

	it("aplica máscara de CNPJ para 14 dígitos", () => {
		expect(maskCpfCnpj("12345678000195")).toBe("12.345.678/0001-95");
	});
});

describe("maskPhone", () => {
	it("aplica máscara para celular de 11 dígitos", () => {
		expect(maskPhone("16996029107")).toBe("(16) 99602-9107");
	});

	it("aplica máscara para fixo de 10 dígitos", () => {
		expect(maskPhone("1636001234")).toBe("(16) 3600-1234");
	});
});

describe("maskCep", () => {
	it("aplica máscara de CEP de 8 dígitos", () => {
		expect(maskCep("14020260")).toBe("14020-260");
	});
});

describe("isValidCpf & isValidCnpj", () => {
	it("rejeita CPFs inválidos ou repetidos", () => {
		expect(isValidCpf("11111111111")).toBe(false);
		expect(isValidCpf("12345678900")).toBe(false);
	});

	it("rejeita CNPJs inválidos ou repetidos", () => {
		expect(isValidCnpj("00000000000000")).toBe(false);
		expect(isValidCnpj("11111111111111")).toBe(false);
	});
});
