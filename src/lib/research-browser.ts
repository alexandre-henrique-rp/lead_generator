/**
 * Webscraping client-side de site de empresa.
 *
 * Roda 100% no browser (sem precisar de Playwright/Puppeteer no servidor).
 * Usa CORS proxy público pra contornar a política same-origin.
 *
 * Cascade de proxies (3 opções, fallback automático):
 *   1. https://corsproxy.io
 *   2. https://api.allorigins.win
 *   3. https://api.codetabs.com
 *
 * Extrai da página:
 *   - Emails (mailto: + regex no HTML)
 *   - Telefones (regex BR)
 *   - Links de redes sociais (LinkedIn, Instagram, Facebook, WhatsApp)
 *   - URL da página de contato (se existir)
 *   - Meta description / og:description (resumo curto)
 *
 * Uso:
 *   const dados = await enriquecerNoBrowser(lead);
 */

import type { LeadInputCompleto } from "./prompts/cold-outreach";

interface BrowserEnrichment {
	site: string | null;
	emails: string[];
	telefones: string[];
	redesSociais: Array<{ tipo: string; url: string }>;
	descricao: string | null;
	paginaContato: string | null;
	fonteUsada: string;
}

const CORS_PROXIES = [
	{
		nome: "corsproxy.io",
		buildUrl: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
	},
	{
		nome: "allorigins.win",
		buildUrl: (url: string) =>
			`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
	},
	{
		nome: "codetabs.com",
		buildUrl: (url: string) =>
			`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
	},
] as const;

const TIMEOUT_MS = 8000;

async function fetchComCorsProxy(
	url: string,
	signal: AbortSignal,
): Promise<{ html: string; proxy: string }> {
	let lastError: Error | null = null;

	for (const proxy of CORS_PROXIES) {
		try {
			const proxyUrl = proxy.buildUrl(url);
			const res = await fetch(proxyUrl, {
				signal,
				headers: { Accept: "text/html,application/xhtml+xml" },
			});
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const html = await res.text();
			if (html.length < 100) {
				throw new Error("resposta muito curta (provavelmente bloqueada)");
			}
			return { html, proxy: proxy.nome };
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			// tenta próximo proxy
		}
	}

	throw lastError ?? new Error("Todos os CORS proxies falharam");
}

const EMAIL_REGEX = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
const PHONE_BR_REGEX =
	/(?:\+?55\s?)?\(?(?:\d{2})\)?[\s.-]?(?:\d{4,5})[\s.-]?\d{4}\b/g;
const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const PHONE_HREF_REGEX = /tel:(\+?[\d\s()-]+)/gi;
const CONTACT_PATH_HINTS = [
	"contato",
	"fale-conosco",
	"contact",
	"quem-somos",
	"sobre",
	"empresa",
];

function extrairEmails(html: string): string[] {
	const emails = new Set<string>();
	for (const m of html.matchAll(MAILTO_REGEX)) {
		if (m[1]) emails.add(m[1].toLowerCase());
	}
	for (const m of html.matchAll(EMAIL_REGEX)) {
		if (m[1]) emails.add(m[1].toLowerCase());
	}
	// Filtra falsos positivos óbvios
	return [...emails].filter((email) => {
		if (email.endsWith(".png") || email.endsWith(".jpg")) return false;
		if (
			email.includes("exemplo") ||
			email.includes("example.com") ||
			email.includes("@sentry") ||
			email.includes("wixpress") ||
			email.includes("schema.org") ||
			email.includes("@2x")
		)
			return false;
		// TLDs válidos básicos
		if (!/\.[a-z]{2,}$/i.test(email)) return false;
		return true;
	});
}

function extrairTelefones(html: string): string[] {
	const tels = new Set<string>();
	for (const m of html.matchAll(PHONE_HREF_REGEX)) {
		if (m[1]) tels.add(m[1].trim());
	}
	for (const m of html.matchAll(PHONE_BR_REGEX)) {
		if (m[0]) {
			const digits = m[0].replace(/\D/g, "");
			if (digits.length === 10 || digits.length === 11) {
				tels.add(m[0].trim());
			}
		}
	}
	return [...tels].slice(0, 5);
}

function extrairRedesSociais(html: string): Array<{ tipo: string; url: string }> {
	const redes: Array<{ tipo: string; url: string }> = [];
	const patterns: Array<{ tipo: string; regex: RegExp }> = [
		{ tipo: "LinkedIn", regex: /https?:\/\/(?:www\.)?linkedin\.com\/[a-zA-Z0-9_/-]+/g },
		{ tipo: "Instagram", regex: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/g },
		{ tipo: "Facebook", regex: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._/-]+/g },
		{ tipo: "WhatsApp", regex: /https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[a-zA-Z0-9?=&_-]+/g },
		{ tipo: "YouTube", regex: /https?:\/\/(?:www\.)?youtube\.com\/[a-zA-Z0-9_/-]+/g },
	];

	for (const { tipo, regex } of patterns) {
		for (const m of html.matchAll(regex)) {
			if (m[0] && !redes.some((r) => r.url === m[0])) {
				redes.push({ tipo, url: m[0] });
			}
			if (redes.filter((r) => r.tipo === tipo).length >= 2) break;
		}
	}

	return redes.slice(0, 8);
}

function extrairDescricao(html: string): string | null {
	// Tenta og:description primeiro (mais rico)
	const ogMatch = html.match(
		/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
	);
	if (ogMatch?.[1]) return decodeEntities(ogMatch[1]).slice(0, 500);

	// Fallback: meta description
	const metaMatch = html.match(
		/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
	);
	if (metaMatch?.[1]) return decodeEntities(metaMatch[1]).slice(0, 500);

	return null;
}

function extrairPaginaContato(
	html: string,
	baseUrl: string,
): string | null {
	const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*contato[^<]*)<\/a>/gi;
	const hrefRegex = /href=["']([^"']+)["']/gi;
	let bestMatch: string | null = null;
	const allHrefs: string[] = [];
	for (const m of html.matchAll(hrefRegex)) {
		if (m[1]) allHrefs.push(m[1]);
	}

	// 1) Procura link com texto contendo "contato"
	for (const m of html.matchAll(linkRegex)) {
		const href = m[1];
		if (!href) continue;
		try {
			const abs = new URL(href, baseUrl).toString();
			if (abs.startsWith("http")) return abs;
		} catch {
			// ignore
		}
	}

	// 2) Procura em todos os hrefs palavras-chave
	for (const href of allHrefs) {
		const lower = href.toLowerCase();
		if (CONTACT_PATH_HINTS.some((h) => lower.includes(h))) {
			try {
				const abs = new URL(href, baseUrl).toString();
				if (abs.startsWith("http") && !bestMatch) bestMatch = abs;
			} catch {
				// ignore
			}
		}
	}

	return bestMatch;
}

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ");
}

/**
 * Enriquece dados da empresa buscando no website dela via CORS proxy.
 * Roda 100% no browser. Retorna null se tudo falhar.
 */
export async function enriquecerNoBrowser(
	lead: Pick<LeadInputCompleto, "razaoSocial" | "nome" | "website" | "cidade">,
	siteHint?: string | null,
): Promise<BrowserEnrichment | null> {
	const site =
		siteHint ||
		lead.website ||
		(lead.razaoSocial
			? `https://${lead.razaoSocial
					.toLowerCase()
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.replace(/[^a-z0-9]+/g, "")
					.replace(/ltda|me|epp|sa|eireli$/g, "")}.com.br`
			: null);

	if (!site) {
		console.log("[research-browser] sem site conhecido, pulando");
		return null;
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		console.log(`[research-browser] fetching ${site} via CORS proxy...`);
		const { html, proxy } = await fetchComCorsProxy(site, controller.signal);
		clearTimeout(timeout);
		console.log(
			`[research-browser] ✅ ${html.length} chars via ${proxy}`,
		);

		const emails = extrairEmails(html);
		const telefones = extrairTelefones(html);
		const redesSociais = extrairRedesSociais(html);
		const descricao = extrairDescricao(html);
		const paginaContato = extrairPaginaContato(html, site);

		// Se achou página de contato, busca emails nela também
		let emailsExtras: string[] = [];
		if (paginaContato) {
			try {
				const controller2 = new AbortController();
				const t2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);
				const { html: htmlContato } = await fetchComCorsProxy(
					paginaContato,
					controller2.signal,
				);
				clearTimeout(t2);
				emailsExtras = extrairEmails(htmlContato);
			} catch {
				// silencioso — não é crítico
			}
		}

		const todosEmails = [...new Set([...emails, ...emailsExtras])];

		return {
			site,
			emails: todosEmails,
			telefones,
			redesSociais,
			descricao,
			paginaContato,
			fonteUsada: proxy,
		};
	} catch (err) {
		clearTimeout(timeout);
		console.log(
			`[research-browser] ❌ falhou: ${err instanceof Error ? err.message : String(err)}`,
		);
		return null;
	}
}
