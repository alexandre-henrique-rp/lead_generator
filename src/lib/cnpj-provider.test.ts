import { describe, expect, it, vi } from "vitest";
import { consultarCnpjComFallback } from "./cnpj-provider";

describe("consultarCnpjComFallback", () => {
	it("@spec:AC-001 usa OpenCNPJ quando a BrasilAPI bloqueia o acesso com 403", async () => {
		const brasilApi = vi
			.fn<() => Promise<string>>()
			.mockRejectedValue(new Error("API_ERROR:403"));
		const openCnpj = vi.fn<() => Promise<string>>().mockResolvedValue("dados");
		const onFallback = vi.fn();

		await expect(
			consultarCnpjComFallback(brasilApi, openCnpj, onFallback),
		).resolves.toEqual({ data: "dados", fonte: "OPEN_CNPJ" });
		expect(brasilApi).toHaveBeenCalledOnce();
		expect(openCnpj).toHaveBeenCalledOnce();
		expect(onFallback).toHaveBeenCalledWith(expect.any(Error));
	});

	it.each([
		["erro 5xx", "API_ERROR:503:instável"],
		["erro de rede", "NETWORK_ERROR:timeout"],
	])("mantém o fallback para %s", async (_label, message) => {
		const brasilApi = vi
			.fn<() => Promise<string>>()
			.mockRejectedValue(new Error(message));
		const openCnpj = vi.fn<() => Promise<string>>().mockResolvedValue("dados");

		await expect(
			consultarCnpjComFallback(brasilApi, openCnpj),
		).resolves.toEqual({
			data: "dados",
			fonte: "OPEN_CNPJ",
		});
		expect(openCnpj).toHaveBeenCalledOnce();
	});

	it.each([
		["CNPJ inexistente", "CNPJ_NAO_ENCONTRADO"],
		["rate limit", "RATE_LIMIT:60"],
		["outro erro 4xx", "API_ERROR:400"],
	])("não usa OpenCNPJ para %s", async (_label, message) => {
		const brasilApi = vi
			.fn<() => Promise<string>>()
			.mockRejectedValue(new Error(message));
		const openCnpj = vi.fn<() => Promise<string>>();

		await expect(consultarCnpjComFallback(brasilApi, openCnpj)).rejects.toThrow(
			message,
		);
		expect(openCnpj).not.toHaveBeenCalled();
	});

	it("não consulta OpenCNPJ quando BrasilAPI responde", async () => {
		const brasilApi = vi.fn<() => Promise<string>>().mockResolvedValue("dados");
		const openCnpj = vi.fn<() => Promise<string>>();

		await expect(
			consultarCnpjComFallback(brasilApi, openCnpj),
		).resolves.toEqual({ data: "dados", fonte: "BRASILAPI" });
		expect(openCnpj).not.toHaveBeenCalled();
	});
});
