import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ehEmailValido,
	extractContactsFromSite,
	extrairContatosHtml,
	mergeContatoHtml,
	normalizarTelefoneBr,
	normalizarWhatsapp,
	parsearJsonGemini,
	parsearRespostaGemini,
} from "./research-contacts";

describe("normalizarTelefoneBr", () => {
	it("formata celular com DDD", () => {
		expect(normalizarTelefoneBr("(16) 99602-9107")).toBe("(16) 99602-9107");
	});

	it("formata fixo com DDD", () => {
		expect(normalizarTelefoneBr("(11) 3456-7890")).toBe("(11) 3456-7890");
	});

	it("remove código do país 55", () => {
		expect(normalizarTelefoneBr("+55 11 99999-9999")).toBe("(11) 99999-9999");
		expect(normalizarTelefoneBr("551134567890")).toBe("(11) 3456-7890");
	});

	it("remove prefixo internacional 00", () => {
		expect(normalizarTelefoneBr("0055 11 99999-9999")).toBe("(11) 99999-9999");
	});

	it("aceita número sem máscara", () => {
		expect(normalizarTelefoneBr("16996029107")).toBe("(16) 99602-9107");
	});

	it("rejeita números curtos demais", () => {
		expect(normalizarTelefoneBr("123")).toBeNull();
		expect(normalizarTelefoneBr("")).toBeNull();
	});
});

describe("normalizarWhatsapp", () => {
	it("mantém número com 55", () => {
		expect(normalizarWhatsapp("5511999999999")).toBe("5511999999999");
	});

	it("adiciona 55 a número local", () => {
		expect(normalizarWhatsapp("11999999999")).toBe("5511999999999");
		expect(normalizarWhatsapp("(11) 99999-9999")).toBe("5511999999999");
	});

	it("rejeita texto sem número plausível", () => {
		expect(normalizarWhatsapp("não encontrei")).toBeNull();
		expect(normalizarWhatsapp("123")).toBeNull();
	});
});

describe("ehEmailValido", () => {
	it("filtra falsos positivos óbvios", () => {
		expect(ehEmailValido("logo@exemplo.png")).toBe(false);
		expect(ehEmailValido("user@example.com")).toBe(false);
		expect(ehEmailValido("noreply@sentry.io")).toBe(false);
		expect(ehEmailValido("img@2x.png")).toBe(false);
	});

	it("aceita emails reais", () => {
		expect(ehEmailValido("comercial@empresa.com.br")).toBe(true);
		expect(ehEmailValido("vendas@loja.com")).toBe(true);
	});
});

describe("extrairContatosHtml", () => {
	it("extrai emails via mailto e regex", () => {
		const html = `
			<a href="mailto:contato@empresa.com.br">Fale conosco</a>
			<p>comercial@empresa.com.br é nosso email</p>
			<img src="logo@2x.png">
		`;
		const r = extrairContatosHtml(html);
		expect(r.emails).toContain("contato@empresa.com.br");
		expect(r.emails).toContain("comercial@empresa.com.br");
		expect(r.emails.some((e) => e.includes("2x.png"))).toBe(false);
	});

	it("extrai telefones via href tel:", () => {
		const html = `
			<a href="tel:+551636000000">Ligar</a>
			<a href="tel:(16) 99602-9107">WhatsApp</a>
		`;
		const r = extrairContatosHtml(html);
		expect(r.telefones).toContain("(16) 3600-0000");
		expect(r.telefones).toContain("(16) 99602-9107");
	});

	it("extrai whatsapp via wa.me e api.whatsapp.com", () => {
		const html = `
			<a href="https://wa.me/5516996029107">Zap</a>
			<a href="https://api.whatsapp.com/send?phone=5511999999999">Outro</a>
		`;
		const r = extrairContatosHtml(html);
		// para no primeiro whatsapp encontrado
		expect(r.whatsapp).toMatch(/^55\d{10,11}$/);
	});

	it("retorna vazio pra HTML sem contatos", () => {
		const r = extrairContatosHtml("<html><body>Sem nada aqui</body></html>");
		expect(r.emails).toEqual([]);
		expect(r.telefones).toEqual([]);
		expect(r.whatsapp).toBeNull();
	});
});

describe("mergeContatoHtml", () => {
	it("deduplica emails e telefones", () => {
		const a = {
			emails: ["a@x.com"],
			telefones: ["(11) 99999-9999"],
			whatsapp: null,
		};
		const b = {
			emails: ["a@x.com", "b@x.com"],
			telefones: ["(11) 99999-9999", "(11) 3333-3333"],
			whatsapp: "5511999999999",
		};
		const r = mergeContatoHtml(a, b);
		expect(r.emails).toHaveLength(2);
		expect(r.telefones).toHaveLength(2);
		expect(r.whatsapp).toBe("5511999999999");
	});
});

describe("extractContactsFromSite (fetch mockado)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("combina home e página de contato", async () => {
		const fetchMock = vi.fn(async (url: string | URL) => {
			const u = String(url);
			const html = u.endsWith("/contato")
				? '<a href="mailto:contato@empresa.com.br">mail</a><a href="tel:1134567890">tel</a>'
				: '<p>comercial@empresa.com.br</p><a href="https://wa.me/5511888887777">zap</a>';
			return new Response(html, {
				status: 200,
				headers: { "content-type": "text/html" },
			});
		});
		vi.stubGlobal("fetch", fetchMock);

		const r = await extractContactsFromSite("https://empresa.com.br");
		expect(r.emails).toContain("comercial@empresa.com.br");
		expect(r.emails).toContain("contato@empresa.com.br");
		expect(r.telefones).toContain("(11) 3456-7890");
		expect(r.whatsapp).toBe("5511888887777");
		// home + /contato (para na primeira página de contato válida)
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("não quebra com URL inválida nem com fetch rejeitado", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("rede fora");
			}),
		);
		const r = await extractContactsFromSite("nao-e-url");
		expect(r.emails).toEqual([]);
		expect(r.telefones).toEqual([]);
		expect(r.whatsapp).toBeNull();
	});
});

describe("parsearJsonGemini (JSON mode)", () => {
	it("parseia resposta JSON válida completa", () => {
		const texto = JSON.stringify({
			resumo: "A Empresa X faz Y. Segundo o site oficial, cresceu 20%.",
			site: "https://empresa.com.br",
			emails: ["Comercial@empresa.com.br", "user@example.com"],
			telefones: ["(11) 3456-7890", "(11) 99999-9999"],
			whatsapp: "5511999999999",
			decisores: [{ nome: "João Silva", cargo: "Diretor Comercial" }],
		});
		const r = parsearJsonGemini(texto);
		expect(r).not.toBeNull();
		expect(r?.resumo).toContain("Empresa X");
		expect(r?.site).toBe("https://empresa.com.br");
		// email de exemplo é filtrado
		expect(r?.emails).toEqual(["comercial@empresa.com.br"]);
		expect(r?.telefones).toEqual(["(11) 3456-7890", "(11) 99999-9999"]);
		expect(r?.whatsapp).toBe("5511999999999");
		expect(r?.decisores[0]).toEqual({
			nome: "João Silva",
			cargo: "Diretor Comercial",
		});
	});

	it("remove cercas de markdown", () => {
		const texto =
			'```json\n{"resumo": "ok", "site": null, "emails": [], "telefones": [], "whatsapp": null, "decisores": []}\n```';
		const r = parsearJsonGemini(texto);
		expect(r?.resumo).toBe("ok");
		expect(r?.site).toBeNull();
	});

	it("retorna null pra JSON inválido", () => {
		expect(parsearJsonGemini("isto não é json")).toBeNull();
		expect(parsearJsonGemini("")).toBeNull();
	});

	it("retorna null quando o resumo está vazio (resposta inútil)", () => {
		const texto = JSON.stringify({ resumo: "", site: null });
		expect(parsearJsonGemini(texto)).toBeNull();
	});

	it("tolera campos faltando sem lançar", () => {
		const r = parsearJsonGemini('{"resumo": "só o resumo"}');
		expect(r?.emails).toEqual([]);
		expect(r?.telefones).toEqual([]);
		expect(r?.whatsapp).toBeNull();
		expect(r?.decisores).toEqual([]);
		expect(r?.site).toBeNull();
	});
});

describe("parsearRespostaGemini (fallback de seções)", () => {
	it("parseia CONTATO primeiro (formato novo, sobrevive a truncamento)", () => {
		const texto = `===CONTATO===
Site: https://empresa.com.br
Telefone: (11) 3456-7890; (16) 99602-9107
WhatsApp: 5516996029107
Emails: vendas@empresa.com.br
Decisores: Maria Souza (CFO); Pedro Lima — Gerente Comercial

===RESUMO===
A Empresa X é referência no setor. Segundo o site oficial, expandiu em 2025.`;
		const r = parsearRespostaGemini(texto);
		expect(r).not.toBeNull();
		// URL.toString() normaliza adicionando a barra no host
		expect(r?.site).toBe("https://empresa.com.br/");
		expect(r?.telefones).toEqual(["(11) 3456-7890", "(16) 99602-9107"]);
		expect(r?.whatsapp).toBe("5516996029107");
		expect(r?.emails).toEqual(["vendas@empresa.com.br"]);
		expect(r?.decisores).toEqual([
			{ nome: "Maria Souza", cargo: "CFO" },
			{ nome: "Pedro Lima", cargo: "Gerente Comercial" },
		]);
		expect(r?.resumo).toContain("referência no setor");
	});

	it("parseia RESUMO primeiro (formato antigo)", () => {
		const texto = `===RESUMO===
Resumo da empresa aqui.

===CONTATO===
Site: não encontrei
Emails: sac@empresa.com
Decisores: não encontrei`;
		const r = parsearRespostaGemini(texto);
		expect(r?.resumo).toContain("Resumo da empresa");
		expect(r?.site).toBeNull();
		expect(r?.emails).toEqual(["sac@empresa.com"]);
		expect(r?.decisores).toEqual([]);
	});

	it("trata 'não encontrei' como null/vazio", () => {
		const texto = `===CONTATO===
Site: não encontrei
Telefone: não encontrei
WhatsApp: não encontrei
Emails: não encontrei
Decisores: não encontrei

===RESUMO===
Resumo curto.`;
		const r = parsearRespostaGemini(texto);
		expect(r?.site).toBeNull();
		expect(r?.telefones).toEqual([]);
		expect(r?.whatsapp).toBeNull();
		expect(r?.emails).toEqual([]);
		expect(r?.decisores).toEqual([]);
	});

	it("sem marcadores, usa tudo como resumo (comportamento antigo)", () => {
		const r = parsearRespostaGemini("Texto solto sem seções.");
		expect(r?.resumo).toBe("Texto solto sem seções.");
		expect(r?.emails).toEqual([]);
	});
});
