// ==========================================================================
// research-contacts.ts — extração e parse de contato (isomórfico).
//
// Funções puras de normalização (telefone BR, WhatsApp) + extração de
// contatos em HTML (mailto:, tel:, wa.me) + parsers da resposta do
// Gemini (JSON mode com fallback pro formato de seções).
//
// Sem env vars, sem chaves de API — o fetch aqui é de páginas PÚBLICAS
// do site da empresa (sem credencial). Usado por research.server.ts.
// ==========================================================================

import { maskPhone } from "./masks";

// ==========================================================================
// Tipos
// ==========================================================================

export interface ContatoExtraido {
	site: string | null;
	emails: string[];
	telefones: string[];
	whatsapp: string | null;
	decisores: Array<{ nome: string; cargo: string | null }>;
}

/** Resposta esperada do Gemini: resumo + bloco de contato. */
export type RespostaPesquisaGemini = ContatoExtraido & { resumo: string };

/** Contatos crus extraídos de um HTML (antes da normalização). */
export interface ContatoHtml {
	emails: string[];
	telefones: string[];
	whatsapp: string | null;
}

// ==========================================================================
// Normalização de telefone BR
// ==========================================================================

/**
 * Normaliza um telefone brasileiro pra formato "(DD) NNNNN-NNNN".
 * Remove prefixo internacional (00) e código do país (55).
 * Retorna null se o número não tiver 8-11 dígitos locais.
 */
export function normalizarTelefoneBr(valor: string): string | null {
	let digits = valor.replace(/\D/g, "");
	if (digits.startsWith("00")) digits = digits.slice(2);
	if (digits.length >= 12 && digits.startsWith("55")) digits = digits.slice(2);
	if (digits.length < 8 || digits.length > 11) return null;
	return maskPhone(digits);
}

/**
 * Normaliza um WhatsApp pro formato E.164 sem sinal (+5511999999999 →
 * 5511999999999). Assume código do país 55 quando o número tem 10-11
 * dígitos locais. Retorna null se não for um número plausível.
 */
export function normalizarWhatsapp(valor: string): string | null {
	let digits = valor.replace(/\D/g, "");
	if (digits.startsWith("00")) digits = digits.slice(2);
	if (!digits.startsWith("55")) {
		if (digits.length >= 10 && digits.length <= 11) {
			digits = `55${digits}`;
		} else {
			return null;
		}
	}
	if (digits.length < 12 || digits.length > 13) return null;
	return digits;
}

// ==========================================================================
// Extração de contatos em HTML
// ==========================================================================

/** Filtros de falsos positivo de email (assets, domínios de exemplo). */
export function ehEmailValido(email: string): boolean {
	const lower = email.toLowerCase();
	if (lower.endsWith(".png") || lower.endsWith(".jpg")) return false;
	if (
		lower.includes("exemplo") ||
		lower.includes("example.com") ||
		lower.includes("@sentry") ||
		lower.includes("@2x") ||
		lower.includes("wixpress")
	)
		return false;
	return true;
}

/**
 * Extrai emails, telefones e WhatsApp de um HTML.
 * - emails: mailto: (mais confiável) + regex ampla no texto visível
 * - telefones: hrefs tel:
 * - whatsapp: wa.me/, api.whatsapp.com/send?phone=, whatsapp://send?phone=
 */
export function extrairContatosHtml(html: string): ContatoHtml {
	// 1) emails via mailto:
	const mailtoEmails: string[] = [];
	const mailtoRegex =
		/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
	for (const m of html.matchAll(mailtoRegex)) {
		if (m[1]) mailtoEmails.push(m[1].toLowerCase());
	}

	// 2) emails visíveis no HTML
	const visibleEmails: string[] = [];
	const visibleRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
	for (const m of html.matchAll(visibleRegex)) {
		if (m[1]) visibleEmails.push(m[1].toLowerCase());
	}

	const emails = [...new Set([...mailtoEmails, ...visibleEmails])].filter(
		ehEmailValido,
	);

	// 3) telefones via href tel:
	const telefones: string[] = [];
	const telRegex = /href=["'](?:tel:|phone:)\+?([\d\s().-]{7,20})/gi;
	for (const m of html.matchAll(telRegex)) {
		if (!m[1]) continue;
		const normalizado = normalizarTelefoneBr(m[1]);
		if (normalizado) telefones.push(normalizado);
	}

	// 4) whatsapp via wa.me / api.whatsapp.com / whatsapp://
	const waRegex =
		/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=|whatsapp:\/\/send\?phone=)["'&]?(\d{10,15})/gi;
	let whatsapp: string | null = null;
	for (const m of html.matchAll(waRegex)) {
		if (!m[1]) continue;
		const normalizado = normalizarWhatsapp(m[1]);
		if (normalizado) {
			whatsapp = normalizado;
			break;
		}
	}

	return {
		emails,
		telefones: [...new Set(telefones)],
		whatsapp,
	};
}

/**
 * Merge dois ContatoHtml (home + página de contato), dedup por valor.
 */
export function mergeContatoHtml(a: ContatoHtml, b: ContatoHtml): ContatoHtml {
	return {
		emails: [...new Set([...a.emails, ...b.emails])],
		telefones: [...new Set([...a.telefones, ...b.telefones])],
		whatsapp: a.whatsapp ?? b.whatsapp,
	};
}

const VAZIO_HTML: ContatoHtml = { emails: [], telefones: [], whatsapp: null };

/**
 * Faz fetch de uma página pública com timeout de 5s. Retorna null em
 * qualquer falha (rede, timeout, status != 200, content-type != HTML).
 */
async function fetchHtml(url: string): Promise<string | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);
		const res = await fetch(url, {
			signal: controller.signal,
			headers: { "User-Agent": "Mozilla/5.0 (compatible; KingDevBot/1.0)" },
		});
		clearTimeout(timeout);
		if (!res.ok) return null;
		const contentType = res.headers.get("content-type") ?? "";
		if (contentType && !contentType.includes("text/html")) return null;
		return await res.text();
	} catch {
		return null;
	}
}

/** Caminhos candidatos a página de contato (parados na primeira que responder). */
const PAGINAS_CONTATO = ["/contato", "/fale-conosco"];

/**
 * Extrai contatos do site da empresa: faz fetch da home + tenta até 2
 * páginas de contato (/contato, /fale-conosco) e merge o que encontrar.
 * Qualquer falha de fetch é engolida — retorna o que deu pra achar.
 */
export async function extractContactsFromSite(
	url: string,
): Promise<ContatoHtml> {
	const homeHtml = await fetchHtml(url);
	let resultado = homeHtml ? extrairContatosHtml(homeHtml) : VAZIO_HTML;

	for (const caminho of PAGINAS_CONTATO) {
		let base: URL;
		try {
			base = new URL(url);
		} catch {
			break;
		}
		const paginaHtml = await fetchHtml(
			new URL(caminho, base.origin).toString(),
		);
		if (!paginaHtml) continue;
		resultado = mergeContatoHtml(resultado, extrairContatosHtml(paginaHtml));
		// já achou uma página de contato válida — para
		break;
	}

	return resultado;
}

// ==========================================================================
// Parser JSON mode (formato preferido)
// ==========================================================================

function extrairListaStrings(valor: unknown): string[] {
	if (!Array.isArray(valor)) return [];
	return valor
		.filter((v): v is string => typeof v === "string")
		.map((v) => v.trim())
		.filter(Boolean);
}

function extrairListaDecisores(valor: unknown): Array<{
	nome: string;
	cargo: string | null;
}> {
	if (!Array.isArray(valor)) return [];
	return valor
		.filter((v): v is Record<string, unknown> => {
			return typeof v === "object" && v !== null;
		})
		.map((d) => ({
			nome: typeof d.nome === "string" ? d.nome.trim() : "",
			cargo: typeof d.cargo === "string" ? d.cargo.trim() : null,
		}))
		.filter((d) => d.nome.length > 0)
		.slice(0, 8);
}

/**
 * Parseia a resposta JSON do Gemini (JSON mode). Remove cercas de
 * markdown se presentes. Retorna null se não for JSON válido ou se o
 * resumo estiver vazio (resposta inútil).
 */
export function parsearJsonGemini(
	texto: string,
): RespostaPesquisaGemini | null {
	const limpo = texto
		.trim()
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/i, "");

	let obj: unknown;
	try {
		obj = JSON.parse(limpo);
	} catch {
		return null;
	}
	if (typeof obj !== "object" || obj === null) return null;
	const o = obj as Record<string, unknown>;

	const resumo = typeof o.resumo === "string" ? o.resumo.trim() : "";
	if (!resumo) return null;

	const site =
		typeof o.site === "string" && /^https?:\/\//.test(o.site.trim())
			? o.site.trim()
			: null;

	return {
		resumo,
		site,
		emails: extrairListaStrings(o.emails)
			.map((e) => e.toLowerCase())
			.filter(ehEmailValido)
			.slice(0, 8),
		telefones: extrairListaStrings(o.telefones)
			.map(normalizarTelefoneBr)
			.filter((t): t is string => t !== null)
			.slice(0, 5),
		whatsapp:
			typeof o.whatsapp === "string" ? normalizarWhatsapp(o.whatsapp) : null,
		decisores: extrairListaDecisores(o.decisores),
	};
}

// ==========================================================================
// Parser formato de seções (fallback)
// ==========================================================================

/**
 * Extrai uma linha "Chave: valor" de um bloco de texto.
 */
function extrairLinha(bloco: string, chave: string): string | null {
	const regex = new RegExp(`${chave}:\\s*(.+?)(?:\\n|$)`, "i");
	const match = bloco.match(regex);
	return match?.[1]?.trim() ?? null;
}

function extrairSite(bloco: string): string | null {
	const linha = extrairLinha(bloco, "Site");
	if (!linha || /não encontrei|n\/a/i.test(linha)) return null;
	const match = linha.match(/https?:\/\/[^\s<>"']+/);
	if (!match) return null;
	try {
		const parsed = new URL(match[0].replace(/[.,;)]+$/, ""));
		if (parsed.protocol === "http:" || parsed.protocol === "https:") {
			return parsed.toString();
		}
	} catch {
		return null;
	}
	return null;
}

function extrairEmails(bloco: string): string[] {
	const linha = extrairLinha(bloco, "Emails");
	if (!linha || /não encontrei|n\/a/i.test(linha)) return [];
	const regex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
	const matches = linha.match(regex) ?? [];
	return [
		...new Set(matches.map((m) => m.toLowerCase()).filter(ehEmailValido)),
	].slice(0, 8);
}

function extrairTelefones(bloco: string): string[] {
	const linha = extrairLinha(bloco, "Telefone[s]?");
	if (!linha || /não encontrei|n\/a/i.test(linha)) return [];
	return [
		...new Set(
			linha
				.split(/[;,]/)
				.map((s) => normalizarTelefoneBr(s))
				.filter((t): t is string => t !== null),
		),
	].slice(0, 5);
}

function extrairWhatsapp(bloco: string): string | null {
	const linha = extrairLinha(bloco, "WhatsApp");
	if (!linha || /não encontrei|n\/a/i.test(linha)) return null;
	return normalizarWhatsapp(linha);
}

function extrairDecisores(
	bloco: string,
): Array<{ nome: string; cargo: string | null }> {
	const linha = extrairLinha(bloco, "Decisores");
	if (!linha || /não encontrei|nenhum|n\/a/i.test(linha)) return [];

	const itens = linha
		.split(/[;\n]/)
		.map((s) => s.trim())
		.filter(Boolean);

	return itens
		.map((item) => {
			// "Nome (Cargo)"
			const comParenteses = item.match(/^([^(—\n]+?)\s*\(([^)]+)\)\s*$/);
			if (comParenteses) {
				return {
					nome: comParenteses[1].trim(),
					cargo: comParenteses[2].trim(),
				};
			}
			// "Nome — Cargo" (em dash)
			const comEm = item.match(/^([^-—\n]+?)\s*[—-]{1,2}\s*(.+)$/);
			if (comEm) {
				return {
					nome: comEm[1].trim(),
					cargo: comEm[2].trim(),
				};
			}
			return { nome: item, cargo: null };
		})
		.filter((d) => d.nome.length > 0)
		.slice(0, 8);
}

/**
 * Parseia a resposta em seções do Gemini (fallback quando o JSON mode
 * falha). Aceita CONTATO e RESUMO em qualquer ordem — o CONTATO vem
 * PRIMEIRO no prompt pra sobreviver a truncamento de tokens.
 */
export function parsearRespostaGemini(
	texto: string,
): RespostaPesquisaGemini | null {
	const mContato = texto.match(
		/===\s*CONTATO\s*===([\s\S]*?)(?====\s*RESUMO\s*===|$)/i,
	);
	const mResumo = texto.match(
		/===\s*RESUMO\s*===([\s\S]*?)(?====\s*CONTATO\s*===|$)/i,
	);

	// Sem marcadores: usa tudo como resumo (comportamento do parser antigo)
	const resumoParte = (mResumo?.[1] ?? texto).trim();
	if (!resumoParte) return null;

	const contatoParte = mContato?.[1]?.trim() ?? "";

	return {
		resumo: resumoParte,
		site: extrairSite(contatoParte),
		emails: extrairEmails(contatoParte),
		telefones: extrairTelefones(contatoParte),
		whatsapp: extrairWhatsapp(contatoParte),
		decisores: extrairDecisores(contatoParte),
	};
}
