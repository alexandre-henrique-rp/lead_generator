/**
 * Integração com a BrasilAPI - Consulta de CNPJ
 * Documentação: https://brasilapi.com.br/docs#tag/CNPJ/paths/~1cnpj~1v1~1%7Bcnpj%7D/get
 */

export interface BrasilApiSocio {
	pais?: string | null;
	nome_socio: string;
	codigo_pais?: string | null;
	faixa_etaria?: string | null;
	cnpj_cpf_do_socio?: string | null;
	qualificacao_socio?: string | null;
	codigo_faixa_etaria?: number | null;
	data_entrada_sociedade?: string | null;
	identificador_de_socio?: number | null;
	cpf_representante_legal?: string | null;
	nome_representante_legal?: string | null;
	codigo_qualificacao_socio?: number | null;
	qualificacao_representante_legal?: string | null;
	codigo_qualificacao_representante_legal?: number | null;
}

export interface BrasilApiCnaeSecundario {
	codigo: number;
	descricao: string;
}

export interface BrasilApiRegimeTributario {
	ano: number;
	cnpj_da_scp?: string | null;
	forma_de_tributacao: string;
	quantidade_de_escrituracoes: number;
}

export interface BrasilApiCnpjResponse {
	cnpj: string;
	razao_social?: string;
	nome_fantasia?: string;
	descricao_situacao_cadastral?: string;
	situacao_cadastral?: number;
	data_situacao_cadastral?: string;
	motivo_situacao_cadastral?: number;
	descricao_motivo_situacao_cadastral?: string;
	data_inicio_atividade?: string;
	cnae_fiscal?: number;
	cnae_fiscal_descricao?: string;
	cnaes_secundarios?: BrasilApiCnaeSecundario[];
	regime_tributario?: BrasilApiRegimeTributario[];
	qsa?: BrasilApiSocio[];
	natureza_juridica?: string;
	codigo_natureza_juridica?: number;
	porte?: string;
	codigo_porte?: number;
	descricao_porte?: string;
	capital_social?: number;
	cep?: string;
	uf?: string;
	municipio?: string;
	codigo_municipio?: number;
	codigo_municipio_ibge?: number;
	bairro?: string;
	logradouro?: string;
	numero?: string;
	complemento?: string;
	descricao_tipo_de_logradouro?: string;
	email?: string | null;
	ddd_telefone_1?: string;
	ddd_telefone_2?: string;
	ddd_fax?: string;
	opcao_pelo_simples?: boolean | null;
	data_opcao_pelo_simples?: string | null;
	data_exclusao_do_simples?: string | null;
	opcao_pelo_mei?: boolean | null;
	data_opcao_pelo_mei?: string | null;
	data_exclusao_do_mei?: string | null;
	situacao_especial?: string | null;
	data_situacao_especial?: string | null;
	ente_federativo_responsavel?: string | null;
	identificador_matriz_filial?: number | null;
	descricao_identificador_matriz_filial?: string | null;
	qualificacao_do_responsavel?: number | null;
	nome_cidade_no_exterior?: string | null;
	pais?: string | null;
	codigo_pais?: string | null;
	message?: string;
}

/**
 * Consulta informações de um CNPJ na BrasilAPI.
 * Remove pontuação automaticamente antes da requisição.
 */
export async function consultarCnpjBrasilApi(
	cnpjRaw: string,
): Promise<BrasilApiCnpjResponse> {
	const digits = cnpjRaw.replace(/\D/g, "");
	if (digits.length !== 14) {
		throw new Error("CNPJ inválido. Certifique-se de digitar os 14 dígitos.");
	}

	const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
		headers: {
			Accept: "application/json",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 KingOps/1.0",
		},
	});

	const data = await res.json();

	if (!res.ok) {
		throw new Error(
			data.message || `Erro ao consultar CNPJ na BrasilAPI (${res.status})`,
		);
	}

	return data as BrasilApiCnpjResponse;
}
