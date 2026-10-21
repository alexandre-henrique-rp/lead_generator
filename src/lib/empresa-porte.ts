/**
 * Utilidades para qualificação e inteligência comercial de empresas (CNPJ).
 */

const DOMINIOS_PUBLICOS = new Set([
	"gmail.com",
	"hotmail.com",
	"outlook.com",
	"live.com",
	"yahoo.com",
	"yahoo.com.br",
	"bol.com.br",
	"uol.com.br",
	"terra.com.br",
	"ig.com.br",
	"icloud.com",
	"me.com",
	"proton.me",
	"protonmail.com",
]);

export interface PorteInfo {
	categoria: "MEI" | "ME" | "EPP" | "DEMAIS";
	label: string;
	faturamentoPresumido: string;
	estimativaFuncionarios: string;
	quantidadeFuncionariosMin: number;
}

/**
 * Estima categoria de porte, faturamento presumido e equipe com base no enquadramento.
 */
export function estimarPorteEFaturamento(
	porteRaw?: string | null,
	opcaoSimples?: boolean | null,
	opcaoMei?: boolean | null,
): PorteInfo {
	if (opcaoMei) {
		return {
			categoria: "MEI",
			label: "Microempreendedor Individual (MEI)",
			faturamentoPresumido: "Até R$ 81.000,00 / ano",
			estimativaFuncionarios: "Até 1 colaborador",
			quantidadeFuncionariosMin: 1,
		};
	}

	const p = (porteRaw ?? "").toUpperCase().trim();

	if (p === "MICRO EMPRESA" || p === "ME" || p === "01") {
		return {
			categoria: "ME",
			label: opcaoSimples
				? "Microempresa (ME) · Simples Nacional"
				: "Microempresa (ME)",
			faturamentoPresumido: "Até R$ 360.000,00 / ano",
			estimativaFuncionarios: "1 a 9 colaboradores",
			quantidadeFuncionariosMin: 3,
		};
	}

	if (
		p === "EMPRESA DE PEQUENO PORTE" ||
		p === "EPP" ||
		p === "03" ||
		p === "05"
	) {
		return {
			categoria: "EPP",
			label: "Empresa de Pequeno Porte (EPP)",
			faturamentoPresumido: "R$ 360 mil a R$ 4,8 milhões / ano",
			estimativaFuncionarios: "10 a 49 colaboradores",
			quantidadeFuncionariosMin: 15,
		};
	}

	return {
		categoria: "DEMAIS",
		label: "Médio / Grande Porte (DEMAIS)",
		faturamentoPresumido: "Acima de R$ 4,8 milhões / ano",
		estimativaFuncionarios: "50+ colaboradores",
		quantidadeFuncionariosMin: 50,
	};
}

/**
 * Tenta inferir o website oficial a partir do e-mail corporativo retornado pela Receita Federal.
 */
export function inferirWebsiteDeEmail(email?: string | null): string | null {
	if (!email || !email.includes("@")) return null;
	const dominio = email.trim().toLowerCase().split("@")[1];
	if (!dominio || DOMINIOS_PUBLICOS.has(dominio)) {
		return null;
	}
	return `https://${dominio}`;
}

/**
 * Formata um valor numérico em moeda brasileira (BRL).
 */
export function formatarMoedaBrl(valor?: number | null): string {
	if (valor === undefined || valor === null || Number.isNaN(valor)) {
		return "R$ 0,00";
	}
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(valor);
}

/**
 * Calcula tempo de atividade empresarial em anos e meses a partir da data de abertura.
 */
export function calcularTempoAtividade(
	dataInicio?: string | null,
): string | null {
	if (!dataInicio) return null;
	const inicio = new Date(dataInicio);
	if (Number.isNaN(inicio.getTime())) return null;

	const hoje = new Date();
	let anos = hoje.getFullYear() - inicio.getFullYear();
	let meses = hoje.getMonth() - inicio.getMonth();

	if (meses < 0) {
		anos -= 1;
		meses += 12;
	}

	if (anos <= 0 && meses <= 0) {
		return "Menos de 1 mês";
	}
	if (anos === 0) {
		return `${meses} ${meses === 1 ? "mês" : "meses"}`;
	}
	if (meses === 0) {
		return `${anos} ${anos === 1 ? "ano" : "anos"}`;
	}
	return `${anos} ${anos === 1 ? "ano" : "anos"} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
}
