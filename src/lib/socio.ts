// ==========================================================================
// socio.ts — escolha do SÓCIO PRINCIPAL (QSA) pro hook da mensagem.
// ==========================================================================
// O QSA (Query de Quadro Societário) vem da Receita Federal via BrasilAPI
// e é persistido no model `Socio`. É a única fonte que diz COM CERTEZA
// quem é o dono da empresa — a pesquisa web só traz "decisores", que
// numa corporação grande podem ser diretores que não decidem nada.
//
// Duas saídas possíveis pro hook:
//   - com nome  → "Fala, [primeiro nome]! Tudo bem?"
//   - sem nome  → "Fala, pessoal da [Empresa]! Tudo bem?"
// O prompt recebe o resultado e escolhe o caminho. NUNCA inventa nome.
// ==========================================================================

/** Linha do QSA, como o app precisa (subset do model `Socio`). */
export interface SocioQsa {
	nomeSocio: string;
	qualificacaoSocio: string | null;
	percentualCapital: number | null;
	ordem: number;
	/** CPF/CNPJ mascarado pela Receita (ex.: "***112108**"). */
	cnpjCpfDoSocio: string | null;
}

/** Sócio principal resolvido — pronto pro hook. */
export interface SocioPrincipal {
	/** Nome completo como está no QSA. */
	nome: string;
	/** Primeiro nome, com acento: "José" (vem "JOSE" do banco). */
	primeiroNome: string;
	/** "Sócio-Administrador", "Administrador", "Sócio"… */
	qualificacao: string | null;
}

/**
 * Nomes de firma no QSA — são PESSOAS JURÍDICAS, nunca o dono que a gente
 * quer cumprimentar ("ZOPONE ENGENHARIA E COMERCIO LTDA", "RGO -
 * INCORPORACOES E CONSTRUCOES LTDA."). Se o nome tem sufixo de
 * empresa OU o documento é CNPJ de verdade (14 dígitos sem máscara),
 * o registro é descartado.
 */
const SUFIXO_EMPRESA =
	/\b(LTDA|LIMITADA|EPP|EIRELI|S\s*\/\s*A|SA|ME|INC|CORPORACOES|CORPORA[CÇ][AÃ]O|EMPREGENDOR|NETWORK|GRUPO|HOLDING)\b/;

/** Documento sem máscara e com 14 dígitos = CNPJ (pessoa jurídica). */
function ehCnpjDePessoaJuridica(documento: string | null): boolean {
	if (!documento) return false;
	const digitos = documento.replace(/\D/g, "");
	return digitos.length === 14 && !documento.includes("*");
}

/** Um registro do QSA que representa uma pessoa (não uma empresa). */
function ehPessoa(socio: SocioQsa): boolean {
	const nome = socio.nomeSocio?.trim() ?? "";
	if (!nome) return false;
	if (ehCnpjDePessoaJuridica(socio.cnpjCpfDoSocio)) return false;
	if (SUFIXO_EMPRESA.test(nome)) return false;
	return true;
}

/**
 * Escolhe o sócio principal entre os registros do QSA.
 *
 * Regra: o **PRIMEIRO** sócio da lista (ordem de cadastro da Receita).
 * Se o primeiro for pessoa jurídica (empresa no QSA), pula pro próximo
 * pessoa — não se cumprimenta uma empresa.
 *
 * Retorna `null` quando não há nenhuma pessoa (só empresas, ou QSA vazio)
 * — nesse caso o hook é sem nome (fantasia → razão social).
 */
export function escolherSocioPrincipal(
	socios: SocioQsa[] | null | undefined,
): SocioPrincipal | null {
	const primeiro = (socios ?? [])
		.filter(ehPessoa)
		.sort((a, b) => a.ordem - b.ordem)[0];

	if (!primeiro) return null;

	const nome = primeiro.nomeSocio.trim();
	return {
		nome,
		primeiroNome: primeiroNomeDe(nome),
		qualificacao: primeiro.qualificacaoSocio?.trim() || null,
	};
}

/** Cargo que mostra que a pessoa É a dona (vale pro fallback da pesquisa). */
const CARGO_DE_DONO =
	/(s[oó]cio|propriet[aá]ri|administrador|empres[aá]ri|titular|dono|^\s*ME\s*$)/i;

/**
 * Fallback quando o QSA não tem ninguém: usa o decisor da PESQUISA, mas
 * só se o cargo mostrar que a pessoa é a DONA ("Proprietário/ME",
 * "Provável Proprietário/Administrador", "Empreendedor Individual").
 *
 * NUNCA usa diretor/gerente/CEO — numa corporação grande, "Fala, Fulano!"
 * pro dono errado é pior que "Fala, pessoal da X!".
 */
export function escolherDecisorDono(
	decisores: Array<{ nome: string; cargo: string | null }> | null | undefined,
): SocioPrincipal | null {
	for (const decisor of decisores ?? []) {
		const nome = decisor.nome?.trim() ?? "";
		if (!nome) continue;
		if (SUFIXO_EMPRESA.test(nome)) continue;
		if (!decisor.cargo || !CARGO_DE_DONO.test(decisor.cargo)) continue;

		return {
			nome,
			primeiroNome: primeiroNomeDe(nome),
			qualificacao: decisor.cargo.trim(),
		};
	}
	return null;
}

/** Partículas que nunca são o primeiro nome. */
const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "y"]);

/** Partículas que ficam em minúscula na caixa de frase. */
const PARTICULAS_NOME = new Set([
	"de",
	"do",
	"da",
	"dos",
	"das",
	"e",
	"em",
	"a",
	"o",
]);

/**
 * Caixa de frase preservando acentos: "RIBEIRAO PRETO" → "Ribeirao Preto",
 * "Black Dog Pet Shop" → "Black Dog Pet Shop".
 *
 * Partículas ficam em minúscula ("Padaria do João", "São José do Rio Preto").
 */
export function caixaDeFrase(texto: string): string {
	return texto
		.toLocaleLowerCase("pt-BR")
		.split(" ")
		.map((palavra, indice) => {
			if (!palavra) return palavra;
			if (indice > 0 && PARTICULAS_NOME.has(palavra)) return palavra;
			return palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1);
		})
		.join(" ");
}

/** Receita cola CPF/CNPJ na frente do nome ("46.652.584 FRANCIELE..."). */
function semPrefixoNumerico(texto: string): string {
	const limpo = texto.replace(/^[\d.\s/-]+/, "").trim();
	return limpo || texto.trim();
}

/**
 * Nome da empresa pro hook SEM nome (quando não há sócio nem dono).
 *
 * Ordem pedida: **nome fantasia → razão social → nome do cadastro**.
 * A razão social vem suja da Receita (CPF/CNPJ na frente de MEI), então
 * limpamos o prefixo numérico antes.
 */
export function escolherNomeEmpresa(input: {
	nomeFantasia?: string | null;
	razaoSocial?: string | null;
	nome: string;
}): string {
	const fantasia = (input.nomeFantasia ?? "").trim();
	if (fantasia) return caixaDeFrase(semPrefixoNumerico(fantasia));

	const razao = (input.razaoSocial ?? "").trim();
	if (razao) return caixaDeFrase(semPrefixoNumerico(razao));

	return caixaDeFrase((input.nome ?? "").trim());
}

/** CPF na frente do nome =impseiro individual (MEI): a empresa É a pessoa. */
const CPF_NA_FRENTE = /^\d[\d.\s/-]{7,14}\s+[A-Za-zÀ-ÿ]/;

/**
 * MEI (empresário individual): a Receita grava o CPF na frente do nome da
 * razão social ("46.652.584 FRANCIELE REICHERT RIBEIRO COSTA"). Nesses
 * casos a empresa É a pessoa — e ela é a dona. Sem isso, o hook sem nome
 * sairia "Fala, pessoal da Franciele Reichert Ribeiro Costa!".
 */
export function detectarEmpreendedorIndividual(razaoSocial: string | null): {
	nome: string;
	primeiroNome: string;
} | null {
	const razao = (razaoSocial ?? "").trim();
	if (!razao) return null;
	if (!CPF_NA_FRENTE.test(razao)) return null;

	const nome = razao.replace(/^\d[\d.\s/-]{7,14}\s+/, "").trim();
	if (!nome) return null;

	return { nome, primeiroNome: primeiroNomeDe(nome) };
}

/**
 * Acentos que a Receita perde quando grava o QSA em CAPS sem acento.
 * Só os nomes de pilhagem — o resto sai sem acento mesmo.
 */
const ACENTOS_PRIMEIRO_NOME: Record<string, string> = {
	Jose: "José",
	Luiz: "Luiz",
	Julia: "Júlia",
	Fatima: "Fátima",
	Claudio: "Cláudio",
	Antonio: "Antônio",
	Conceicao: "Conceição",
	Joao: "João",
	Vitoria: "Vitória",
	Eneas: "Enéas",
	Angelo: "Ângelo",
	Romulo: "Rômulo",
	Otavio: "Otávio",
	Sebastiao: "Sebastião",
	Vinicius: "Vinícius",
	Fabricio: "Fabrício",
	Andrea: "Andréa",
	Patricia: "Patrícia",
	Rosangela: "Rosângela",
	Valeria: "Valéria",
	Rafaela: "Rafaela",
	Marcio: "Márcio",
	Josefa: "Josefa",
};

/**
 * Primeiro nome do sócio, em caixa de frase e com acento.
 * "JOSE NUNES PAEZ DE PROENCA JUNIOR" → "José"
 */
export function primeiroNomeDe(nomeCompleto: string): string {
	const tokens = (nomeCompleto ?? "").trim().split(/\s+/).filter(Boolean);

	const primeiroUtil = tokens.find(
		(token) => !PARTICULAS.has(token.toLowerCase()),
	);
	if (!primeiroUtil) return "";

	const base =
		primeiroUtil
			.toLocaleLowerCase("pt-BR")
			.charAt(0)
			.toLocaleUpperCase("pt-BR") +
		primeiroUtil.slice(1).toLocaleLowerCase("pt-BR");

	return ACENTOS_PRIMEIRO_NOME[base] ?? base;
}
