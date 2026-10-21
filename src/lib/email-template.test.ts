import { describe, expect, it } from "vitest";
import { escaparHtml, renderizarEmailPrimeiraMensagem } from "./email-template";

describe("escaparHtml", () => {
	it("escapa tags, aspas e ampersand", () => {
		expect(escaparHtml('<script>alert("x")</script>')).toBe(
			"&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
		);
		expect(escaparHtml("a & b")).toBe("a &amp; b");
		expect(escaparHtml("d'água")).toBe("d&#39;água");
	});

	it("não altera texto comum (pt-BR com acento)", () => {
		expect(escaparHtml("Abraço, Alexandre | King Dev")).toBe(
			"Abraço, Alexandre | King Dev",
		);
	});
});

describe("renderizarEmailPrimeiraMensagem", () => {
	const corpo = [
		"Fala, pessoal do Mau Mau! 49 anos de chão é tradição pesada em Ribeirão.",
		"Sou da King Dev, aqui da região. A gente desenvolve software sob medida pra negócios locais.",
		"Automação de pedido no WhatsApp (fim do papel no pico);",
		"Abraço, Alexandre | King Dev",
	].join("\n\n");

	it("monta um documento HTML completo com o assunto no título", () => {
		const { html } = renderizarEmailPrimeiraMensagem({
			assunto: "Cardápio no zap da Mau Mau?",
			corpo,
		});
		expect(html).toContain("<!doctype html>");
		expect(html).toContain('lang="pt-BR"');
		expect(html).toContain("<title>Cardápio no zap da Mau Mau?</title>");
		expect(html).toContain("King Dev");
		expect(html).toContain("Software sob medida pra negócios locais");
	});

	it("quebra o corpo em parágrafos <p> (linha em branco ou simples)", () => {
		const { html } = renderizarEmailPrimeiraMensagem({
			assunto: "x",
			corpo,
		});
		expect(html.split("<p ").length - 1).toBe(4);
	});

	it("escapa HTML do corpo (XSS-safe — texto vem da LLM)", () => {
		const { html } = renderizarEmailPrimeiraMensagem({
			assunto: 'Olá "amigo" <b>',
			corpo: "<img src=x onerror=alert(1)> & <script>bad()</script>",
		});
		expect(html).not.toContain("<img");
		expect(html).not.toContain("<script>");
		expect(html).not.toContain("<b>");
		expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
		expect(html).toContain("&lt;script&gt;");
		expect(html).toContain("&quot;amigo&quot;");
	});

	it("estiliza a assinatura no último parágrafo", () => {
		const { html } = renderizarEmailPrimeiraMensagem({
			assunto: "x",
			corpo,
		});
		expect(html).toContain("#F4F4F6;font-weight:600");
	});

	it("assinatura fora do fim não ganha estilo de assinatura", () => {
		const { html } = renderizarEmailPrimeiraMensagem({
			assunto: "x",
			corpo: "Abraço, Alexandre | King Dev\n\nFala depois.",
		});
		expect(html.split("#F4F4F6;font-weight:600").length - 1).toBe(0);
	});

	it("corpo vazio gera HTML sem parágrafos (não quebra)", () => {
		const { html } = renderizarEmailPrimeiraMensagem({
			assunto: "x",
			corpo: "   \n\n  ",
		});
		expect(html).not.toContain("<p ");
		expect(html).toContain("<!doctype html>");
	});

	it("devolve o assunto original trimmado (fora do html)", () => {
		const { assunto } = renderizarEmailPrimeiraMensagem({
			assunto: "  Só um detalhe  ",
			corpo: "oi",
		});
		expect(assunto).toBe("Só um detalhe");
	});
});
