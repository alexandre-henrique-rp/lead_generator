/**
 * Módulo para consulta e conversão de Localidades (Estados e Cidades do Brasil).
 * Integração com a API de Localidades do IBGE e mapeamento canônico para AIsa (Apollo & DataForSEO).
 */

export interface EstadoIBGE {
	sigla: string;
	nome: string;
}

export interface MunicipioIBGE {
	id: number;
	nome: string;
}

/**
 * Relação completa e estática dos 27 estados brasileiros para renderização instantânea
 */
export const ESTADOS_BRASIL: EstadoIBGE[] = [
	{ sigla: "AC", nome: "Acre" },
	{ sigla: "AL", nome: "Alagoas" },
	{ sigla: "AP", nome: "Amapá" },
	{ sigla: "AM", nome: "Amazonas" },
	{ sigla: "BA", nome: "Bahia" },
	{ sigla: "CE", nome: "Ceará" },
	{ sigla: "DF", nome: "Distrito Federal" },
	{ sigla: "ES", nome: "Espírito Santo" },
	{ sigla: "GO", nome: "Goiás" },
	{ sigla: "MA", nome: "Maranhão" },
	{ sigla: "MT", nome: "Mato Grosso" },
	{ sigla: "MS", nome: "Mato Grosso do Sul" },
	{ sigla: "MG", nome: "Minas Gerais" },
	{ sigla: "PA", nome: "Pará" },
	{ sigla: "PB", nome: "Paraíba" },
	{ sigla: "PR", nome: "Paraná" },
	{ sigla: "PE", nome: "Pernambuco" },
	{ sigla: "PI", nome: "Piauí" },
	{ sigla: "RJ", nome: "Rio de Janeiro" },
	{ sigla: "RN", nome: "Rio Grande do Norte" },
	{ sigla: "RS", nome: "Rio Grande do Sul" },
	{ sigla: "RO", nome: "Rondônia" },
	{ sigla: "RR", nome: "Roraima" },
	{ sigla: "SC", nome: "Santa Catarina" },
	{ sigla: "SP", nome: "São Paulo" },
	{ sigla: "SE", nome: "Sergipe" },
	{ sigla: "TO", nome: "Tocantins" },
];

/**
 * Remove acentuação e caracteres diacríticos de uma string
 */
export function removerAcentos(texto: string): string {
	return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Formata localização no padrão canônico do Apollo: "Cidade, Nome do Estado, Brazil"
 * Exemplo: "Ribeirão Preto, São Paulo, Brazil"
 */
export function formatarLocalizacaoApollo(
	cidade: string,
	estadoNome: string,
): string {
	const c = cidade.trim();
	const e = estadoNome.trim();
	return `${c}, ${e}, Brazil`;
}

/**
 * Formata localização no padrão canônico do DataForSEO Maps: "CidadeSemAcento,State of EstadoSemAcento,Brazil"
 * Exemplo: "Ribeirao Preto,State of Sao Paulo,Brazil"
 */
export function formatarLocalizacaoDataForSeo(
	cidade: string,
	estadoNome: string,
): string {
	const cSemAcento = removerAcentos(cidade.trim());
	const eSemAcento = removerAcentos(estadoNome.trim());
	return `${cSemAcento},State of ${eSemAcento},Brazil`;
}

/**
 * Formata localização no padrão legível para Google Maps Places API:
 * "Cidade, Estado, Brasil" — funciona bem em pt-BR.
 */
export function formatarLocalizacaoGoogleMaps(
	cidade: string,
	estadoNome: string,
): string {
	return `${cidade.trim()}, ${estadoNome.trim()}, Brasil`;
}

// Cache local em memória para evitar chamadas redundantes ao IBGE
const cacheMunicipios: Record<string, MunicipioIBGE[]> = {};

/**
 * Busca municípios de um estado na API oficial pública do IBGE
 */
export async function fetchMunicipiosIBGE(
	uf: string,
): Promise<MunicipioIBGE[]> {
	const ufUpper = uf.toUpperCase().trim();
	if (!ufUpper) return [];

	if (cacheMunicipios[ufUpper]) {
		return cacheMunicipios[ufUpper];
	}

	try {
		const res = await fetch(
			`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufUpper}/municipios?orderBy=nome`,
		);
		if (!res.ok) {
			throw new Error(`Falha ao obter municípios do IBGE (${res.status})`);
		}
		const data: Array<{ id: number; nome: string }> = await res.json();
		const municipios: MunicipioIBGE[] = data.map((item) => ({
			id: item.id,
			nome: item.nome,
		}));

		cacheMunicipios[ufUpper] = municipios;
		return municipios;
	} catch (error) {
		console.warn("Erro ao buscar municípios do IBGE:", error);
		return [];
	}
}
