import { describe, expect, it } from "vitest";
import {
	higienizarTexto,
	mapearPesquisa,
	montarCadeiaModelos,
	normalizarOportunidades,
	type PesquisaLinha,
	parseRespostaGemini,
} from "./ai-message.server";

const oportunidadeValida = {
	titulo: "Automação de pedido no WhatsApp",
	dor: "pedido se perde no zap pessoal do dono",
	servico: "bot + cardápio com link que manda a comanda formatada",
	ganho: "fim do papel e do 'qual o cardápio?' repetido",
	prioridade: "PRINCIPAL",
};

describe("parseRespostaGemini", () => {
	it("retorna analise, mensagem e oportunidades de JSON válido", () => {
		const raw = JSON.stringify({
			analise: "Lanchonete tradicional em RP, arquétipo A.",
			mensagem: "Fala, pessoal do Mau Mau!",
			oportunidades: [oportunidadeValida],
		});
		const parsed = parseRespostaGemini(raw);
		expect(parsed.analise).toContain("arquétipo A");
		expect(parsed.mensagem).toContain("Mau Mau");
		expect(parsed.oportunidades).toHaveLength(1);
		expect(parsed.oportunidades[0]?.prioridade).toBe("PRINCIPAL");
	});

	it("stripa fence de ```json defensivamente", () => {
		const raw = `\`\`\`json
{"analise":"ok","mensagem":"ok","oportunidades":[]}
\`\`\``;
		const parsed = parseRespostaGemini(raw);
		expect(parsed.analise).toBe("ok");
		expect(parsed.oportunidades).toEqual([]);
	});

	it("retorna [] quando oportunidades vem ausente (não quebra)", () => {
		const raw = JSON.stringify({ analise: "ok", mensagem: "ok" });
		const parsed = parseRespostaGemini(raw);
		expect(parsed.oportunidades).toEqual([]);
	});

	it("lança erro quando falta analise ou mensagem", () => {
		expect(() =>
			parseRespostaGemini(JSON.stringify({ analise: "só análise" })),
		).toThrow(/formato inesperado/);
	});

	it("lança erro em JSON inválido", () => {
		expect(() => parseRespostaGemini("não é json")).toThrow(
			/formato inesperado/,
		);
	});
});

describe("montarCadeiaModelos (gate de custo do Gemini)", () => {
	it("sem gate e sem config: só o modelo gratuito (custo zero)", () => {
		expect(montarCadeiaModelos(undefined, false)).toEqual([
			"gemini-3.5-flash-lite",
		]);
		expect(montarCadeiaModelos(null, false)).toEqual(["gemini-3.5-flash-lite"]);
		expect(montarCadeiaModelos("   ", false)).toEqual([
			"gemini-3.5-flash-lite",
		]);
	});

	it("com gate aberto e sem config: cadeia completa (pode faturar)", () => {
		expect(montarCadeiaModelos("", true)).toEqual([
			"gemini-3.5-flash-lite",
			"gemini-3.8-flash",
			"gemini-2.5-flash",
		]);
	});

	it("config explícita do Operador é sempre respeitada (sem gate = sem fallback pago)", () => {
		expect(montarCadeiaModelos("gemini-2.5-flash", false)).toEqual([
			"gemini-2.5-flash",
		]);
	});

	it("com gate: config primeiro + cadeia sem repetição", () => {
		expect(montarCadeiaModelos("gemini-3.8-flash", true)).toEqual([
			"gemini-3.8-flash",
			"gemini-3.5-flash-lite",
			"gemini-2.5-flash",
		]);
	});
});

describe("higienização anti-bullets (safety net do structured output)", () => {
	it("remove marcadores de início de linha (•, -, *, –) e trimma", () => {
		const bruto = "• Fala, pessoal do Mau Mau!\n- Sou da King Dev\n* Abraço";
		expect(higienizarTexto(bruto)).toBe(
			"Fala, pessoal do Mau Mau!\nSou da King Dev\nAbraço",
		);
	});

	it("colapsa 3+ quebras de linha em dupla e trimma as pontas", () => {
		expect(higienizarTexto("  a\n\n\n\nb  ")).toBe("a\n\nb");
	});

	it("não mexe em texto sem marcador", () => {
		expect(higienizarTexto("Fala, pessoal do Mau Mau!")).toBe(
			"Fala, pessoal do Mau Mau!",
		);
	});

	it("parseRespostaGemini aplica a higienização na mensagem", () => {
		const raw = JSON.stringify({
			analise: "ok",
			mensagem:
				"• Fala, pessoal do Mau Mau!\n\n- Automação do balcão;\n\nAbraço, Alexandre | King Dev",
			oportunidades: [],
		});
		const parsed = parseRespostaGemini(raw);
		expect(parsed.mensagem).not.toMatch(/^[•\-*]/m);
		expect(parsed.mensagem).toContain("Fala, pessoal do Mau Mau!");
		expect(parsed.mensagem).toContain("Automação do balcão;");
	});
});

describe("parseRespostaGemini — assunto (canal EMAIL)", () => {
	it("extrai e trimma o assunto quando presente", () => {
		const raw = JSON.stringify({
			assunto: "  Seu cardápio no zap da padaria?  ",
			analise: "ok",
			mensagem: "ok",
			oportunidades: [],
		});
		expect(parseRespostaGemini(raw).assunto).toBe(
			"Seu cardápio no zap da padaria?",
		);
	});

	it("aceita nomes flexíveis (subject / assunto_email)", () => {
		const comSubject = JSON.stringify({
			subject: "Falta só uma coisa no seu site",
			analise: "ok",
			mensagem: "ok",
		});
		expect(parseRespostaGemini(comSubject).assunto).toBe(
			"Falta só uma coisa no seu site",
		);

		const comHifen = JSON.stringify({
			assunto_email: "Idade de casa boa, hein",
			analise: "ok",
			mensagem: "ok",
		});
		expect(parseRespostaGemini(comHifen).assunto).toBe(
			"Idade de casa boa, hein",
		);
	});

	it("assunto ausente ou vazio fica undefined (WHATSAPP não tem)", () => {
		const semAssunto = JSON.stringify({ analise: "ok", mensagem: "ok" });
		expect(parseRespostaGemini(semAssunto).assunto).toBeUndefined();

		const vazio = JSON.stringify({
			assunto: "   ",
			analise: "ok",
			mensagem: "ok",
		});
		expect(parseRespostaGemini(vazio).assunto).toBeUndefined();
	});
});

describe("mapearPesquisa (PesquisaLead → prompt)", () => {
	const linhaBase: PesquisaLinha = {
		resumo: "Transportadora regional com 8 rotas fixas.",
		site: "https://exemplo.com.br",
		emails: '["comercial@exemplo.com.br"]',
		telefones: '["(16) 3333-4444", "(16) 99999-0000"]',
		whatsapp: "5516999990000",
		decisores: '[{"nome":"Carlos Lima","cargo":"diretor"}]',
		pesquisadoEm: new Date("2026-10-19"),
		fonte: "gemini-grounded",
	};

	it("retorna null quando não há pesquisa", () => {
		expect(mapearPesquisa(null)).toBeNull();
		expect(mapearPesquisa(undefined)).toBeNull();
	});

	it("converte os campos JSON-as-string em arrays", () => {
		const p = mapearPesquisa(linhaBase);
		expect(p?.emails).toEqual(["comercial@exemplo.com.br"]);
		expect(p?.telefones).toEqual(["(16) 3333-4444", "(16) 99999-0000"]);
		expect(p?.decisores).toEqual([{ nome: "Carlos Lima", cargo: "diretor" }]);
		expect(p?.whatsapp).toBe("5516999990000");
		expect(p?.fonte).toBe("gemini-grounded");
		expect(p?.pesquisadoEm).toBeInstanceOf(Date);
	});

	it("JSON inválido vira [] — nunca derruba a geração", () => {
		const p = mapearPesquisa({
			...linhaBase,
			emails: "lixo não é json",
			telefones: null,
			decisores: "{broken",
		});
		expect(p?.emails).toEqual([]);
		expect(p?.telefones).toEqual([]);
		expect(p?.decisores).toEqual([]);
	});

	it("descarta decisores malformados e nome vazio", () => {
		const p = mapearPesquisa({
			...linhaBase,
			decisores: JSON.stringify([
				"string solta",
				null,
				{ cargo: "sócio sem nome" },
				{ nome: "   " },
				{ nome: " Ana Souza ", cargo: null },
				{ nome: "Pedro", cargo: 42 },
			]),
		});
		expect(p?.decisores).toEqual([
			{ nome: "Ana Souza", cargo: null },
			{ nome: "Pedro", cargo: null },
		]);
	});
});

describe("normalizarOportunidades", () => {
	it("mantém itens válidos e descarta incompletos", () => {
		const lista = normalizarOportunidades([
			oportunidadeValida,
			{ titulo: "Só título" },
			null,
			"string solta",
			{
				titulo: "Google Meu Negócio",
				dor: "não aparece no maps",
				servico: "otimização do perfil",
				ganho: "aparecer na busca local",
				prioridade: "entrada",
			},
		]);
		expect(lista).toHaveLength(2);
		expect(lista[0]?.prioridade).toBe("PRINCIPAL");
		expect(lista[1]?.prioridade).toBe("ENTRADA");
	});

	it("normaliza prioridade fora do enum para ENTRADA", () => {
		const lista = normalizarOportunidades([
			{ ...oportunidadeValida, prioridade: "QUALQUER_COISA" },
		]);
		expect(lista[0]?.prioridade).toBe("ENTRADA");
	});

	it("retorna [] para input não-array", () => {
		expect(normalizarOportunidades(undefined)).toEqual([]);
		expect(normalizarOportunidades("x")).toEqual([]);
		expect(normalizarOportunidades({})).toEqual([]);
	});

	it("limita a 5 oportunidades", () => {
		const muitas = Array.from({ length: 8 }, (_, i) => ({
			...oportunidadeValida,
			titulo: `Oportunidade ${i}`,
		}));
		expect(normalizarOportunidades(muitas)).toHaveLength(5);
	});
});
