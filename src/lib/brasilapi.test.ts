import { describe, expect, it, vi } from "vitest";
import { consultarCnpjBrasilApi } from "./brasilapi";

describe("consultarCnpjBrasilApi", () => {
	it("deve lançar erro se o CNPJ não tiver 14 dígitos", async () => {
		await expect(consultarCnpjBrasilApi("123")).rejects.toThrow(
			"CNPJ inválido. Certifique-se de digitar os 14 dígitos.",
		);
	});

	it("deve chamar a URL correta limpando a pontuação e retornar dados", async () => {
		const mockData = {
			cnpj: "30367375000155",
			razao_social: "ALEXANDRE HENRIQUE DA ROCHA ARAUJO",
			nome_fantasia: "KING DEV",
			municipio: "RIBEIRAO PRETO",
			uf: "SP",
		};

		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => mockData,
		});
		vi.stubGlobal("fetch", fetchMock);

		const result = await consultarCnpjBrasilApi("30.367.375/0001-55");
		expect(fetchMock).toHaveBeenCalledWith(
			"https://brasilapi.com.br/api/cnpj/v1/30367375000155",
			expect.objectContaining({
				headers: expect.objectContaining({ Accept: "application/json" }),
			}),
		);
		expect(result.razao_social).toBe("ALEXANDRE HENRIQUE DA ROCHA ARAUJO");
		expect(result.nome_fantasia).toBe("KING DEV");

		vi.unstubAllGlobals();
	});

	it("deve repassar mensagem de erro quando a API retornar status de erro", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			json: async () => ({
				message: "CNPJ 00.000.000/0000-00 não encontrado.",
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(consultarCnpjBrasilApi("00000000000000")).rejects.toThrow(
			"CNPJ 00.000.000/0000-00 não encontrado.",
		);

		vi.unstubAllGlobals();
	});
});
