import { describe, expect, it } from "vitest";
import {
	buildProjectWhatsappUrl,
	EXPERTISE_ITEMS,
	filterPortfolioCases,
	KING_DEV_WHATSAPP_NUMBER,
	PORTFOLIO_CASES,
	SMALL_PROJECT_OFFERS,
} from "./landing-portfolio";

describe("landing-portfolio", () => {
	it("contém a stack Full-Stack completa (Node.js, React, Golang, DevOps/Linux e AI Engineering) em EXPERTISE_ITEMS", () => {
		const combinedNames = EXPERTISE_ITEMS.map((item) => item.name).join(" ");
		expect(combinedNames).toContain("Node.js");
		expect(combinedNames).toContain("React");
		expect(combinedNames).toContain("Golang");
		expect(combinedNames).toContain("AI Engineering");
		expect(combinedNames).toContain("DevOps");
		expect(combinedNames).toContain("Linux");
	});

	it("retorna todos os cases quando a categoria selecionada é 'todos'", () => {
		const result = filterPortfolioCases(PORTFOLIO_CASES, "todos");
		expect(result).toHaveLength(PORTFOLIO_CASES.length);
	});

	it("filtra corretamente os cases por categoria específica", () => {
		const sistemas = filterPortfolioCases(PORTFOLIO_CASES, "sistemas");
		expect(sistemas.every((item) => item.category === "sistemas")).toBe(true);
		expect(sistemas.map((item) => item.id)).toEqual(["sisnato", "oidoutor"]);

		const fintech = filterPortfolioCases(PORTFOLIO_CASES, "fintech");
		expect(fintech.map((item) => item.id)).toEqual(["greeninvest"]);

		const automacao = filterPortfolioCases(PORTFOLIO_CASES, "automacao");
		expect(automacao.map((item) => item.id)).toEqual(["agente-ia"]);
	});

	it("gera link padrão de WhatsApp quando nenhum parâmetro é preenchido", () => {
		const url = buildProjectWhatsappUrl();
		expect(url).toContain(`https://wa.me/${KING_DEV_WHATSAPP_NUMBER}?text=`);
		const decoded = decodeURIComponent(url.split("?text=")[1] ?? "");
		expect(decoded).toContain("King Dev Tec");
	});

	it("monta mensagem estruturada no WhatsApp com nome, contato, projeto e mensagem", () => {
		const url = buildProjectWhatsappUrl({
			nome: "Carlos Silva",
			contato: "Pizzaria Bella",
			tipoProjeto: "Cardápio Digital + Pedido no WhatsApp",
			mensagem: "Preciso de catálogo com borda recheada e entrega por bairro.",
		});

		const decoded = decodeURIComponent(url.split("?text=")[1] ?? "");
		expect(decoded).toContain("*Nome:* Carlos Silva");
		expect(decoded).toContain("*Empresa/Contato:* Pizzaria Bella");
		expect(decoded).toContain(
			"*Interesse:* Cardápio Digital + Pedido no WhatsApp",
		);
		expect(decoded).toContain(
			"*Detalhes:* Preciso de catálogo com borda recheada e entrega por bairro.",
		);
	});

	it("mantém os 5 pacotes enxutos de pequenos projetos sem expor preço fixo ou CNPJ", () => {
		expect(SMALL_PROJECT_OFFERS).toHaveLength(5);
		for (const offer of SMALL_PROJECT_OFFERS) {
			expect(offer.title.length).toBeGreaterThan(5);
			expect(offer.features.length).toBeGreaterThanOrEqual(3);
			expect(offer.description).not.toMatch(/R\$\s*\d/);
			expect(offer.description).not.toMatch(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
		}
	});
});
