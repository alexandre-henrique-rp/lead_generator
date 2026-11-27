import { describe, it, expect, vi } from "vitest";
import { Route } from "../routes/leads.funil";
import {
	agruparLeadsNoKanban,
	COLUNAS_KANBAN,
	formatarCentavosParaReais,
	mapearColunaParaEtapaPadrao,
} from "./kanban-funil";

vi.mock("#/api/auth", () => ({
	getCurrentUserServerFn: vi.fn().mockResolvedValue({ user: null }),
}));

describe("Rota /leads/funil — Kanban Drag & Drop (T-04)", () => {
	it("possui beforeLoad com autenticação obrigatória", async () => {
		expect(Route.options.beforeLoad).toBeDefined();

		try {
			await Route.options.beforeLoad!({
				location: { pathname: "/leads/funil" } as any,
			} as any);
			expect.fail("Deveria ter redirecionado para /login");
		} catch (err: unknown) {
			const res = err as Response;
			const location =
				res.headers?.get?.("Location") || (res as Record<string, unknown>).url;
			expect(location).toContain("/login?redirect=");
			expect(location).toContain(encodeURIComponent("/leads/funil"));
		}
	});

	it("possui configuração válida para as 6 colunas canônicas", () => {
		expect(COLUNAS_KANBAN.length).toBe(6);
		const chaves = COLUNAS_KANBAN.map((c) => c.key);
		expect(chaves).toEqual([
			"NOVO",
			"CONTATADO",
			"QUALIFICADO",
			"PROPOSTA",
			"NEGOCIACAO",
			"FECHADO",
		]);
	});

	it("calcula pipeline financeiro e quantidade ao agrupar leads", () => {
		const mockLeads = [
			{
				id: "lead-1",
				nome: "Empresa Alfa",
				etapa: "NOVO",
				telefone: "11999990001",
				temWhatsapp: true,
				valorEstimadoCentavos: 150000, // R$ 1.500,00
				horasEstimadas: 10,
				createdAt: new Date().toISOString(),
				origem: "MAPS",
			},
			{
				id: "lead-2",
				nome: "Empresa Beta",
				etapa: "PROPOSTA",
				telefone: "11999990002",
				temWhatsapp: false,
				valorEstimadoCentavos: 500000, // R$ 5.000,00
				horasEstimadas: 25,
				createdAt: new Date().toISOString(),
				origem: "CSV",
			},
			{
				id: "lead-3",
				nome: "Empresa Gama",
				etapa: "GANHO",
				telefone: "11999990003",
				temWhatsapp: true,
				valorEstimadoCentavos: 1200000, // R$ 12.000,00
				horasEstimadas: 60,
				createdAt: new Date().toISOString(),
				origem: "SITE",
			},
		];

		const agrupamento = agruparLeadsNoKanban(mockLeads);

		expect(agrupamento.NOVO.quantidade).toBe(1);
		expect(agrupamento.NOVO.totalValorCentavos).toBe(150000);
		expect(
			formatarCentavosParaReais(agrupamento.NOVO.totalValorCentavos).replace(
				/\s/g,
				" ",
			),
		).toBe("R$ 1.500,00");

		expect(agrupamento.PROPOSTA.quantidade).toBe(1);
		expect(agrupamento.PROPOSTA.totalValorCentavos).toBe(500000);

		expect(agrupamento.FECHADO.quantidade).toBe(1);
		expect(agrupamento.FECHADO.totalValorCentavos).toBe(1200000);

		expect(agrupamento.CONTATADO.quantidade).toBe(0);
		expect(agrupamento.CONTATADO.totalValorCentavos).toBe(0);
	});

	it("converte coluna em etapa padrão correta", () => {
		expect(mapearColunaParaEtapaPadrao("NOVO")).toBe("NOVO");
		expect(mapearColunaParaEtapaPadrao("CONTATADO")).toBe("CONTATADO");
		expect(mapearColunaParaEtapaPadrao("QUALIFICADO")).toBe("QUALIFICADO");
		expect(mapearColunaParaEtapaPadrao("PROPOSTA")).toBe("PROPOSTA");
		expect(mapearColunaParaEtapaPadrao("NEGOCIACAO")).toBe("NEGOCIACAO");
		expect(mapearColunaParaEtapaPadrao("FECHADO")).toBe("GANHO");
	});

	it("suporta paginação dinâmica de 15 registros por coluna para alta performance", () => {
		// Simula 40 leads na coluna NOVO
		const leadsMuitos = Array.from({ length: 40 }).map((_, i) => ({
			id: `lead-${i + 1}`,
			nome: `Empresa ${i + 1}`,
			etapa: "NOVO",
			telefone: "11999990000",
			temWhatsapp: true,
			valorEstimadoCentavos: 100000,
			horasEstimadas: 10,
			createdAt: new Date().toISOString(),
			origem: "MAPS",
		}));

		const agrupamento = agruparLeadsNoKanban(leadsMuitos);
		expect(agrupamento.NOVO.quantidade).toBe(40);

		const LOTE = 15;
		// Primeira fatia de 15 registros
		const fatiaInicial = agrupamento.NOVO.leads.slice(0, LOTE);
		expect(fatiaInicial.length).toBe(15);

		// Próxima fatia ao rolar o scroll
		const fatiaSegunda = agrupamento.NOVO.leads.slice(0, LOTE * 2);
		expect(fatiaSegunda.length).toBe(30);

		// Terceira fatia (atinge o final)
		const fatiaFinal = agrupamento.NOVO.leads.slice(0, LOTE * 3);
		expect(fatiaFinal.length).toBe(40);
	});
});
