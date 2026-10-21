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
 * Peso da qualificação — quem manda na empresa fala mais alto.
 * Sócio-Administrador > Administrador > Sócio > Presidente/Diretor.
 */
function pesoQualificacao(qualificacao: string | null): number {
	const q = (qualificacao ?? "").toLowerCase();
	if (!q) return 0;
	if (q.includes("socio-administrador") || q.includes("sócio-administrador"))
		return 5;
	if (q.includes("administrador")) return 4;
	if (q.includes("socio") || q.includes("sócio")) return 3;
	if (q.includes("presidente") || q.includes("diretor")) return 2;
	if (q.includes("representante")) return 1;
	return 0;
}

/**
 * Escolhe o sócio principal entre os registros do QSA.
 *
 * Ordem: qualifying weight (admin > sócio) → percentual de capital →
 * ordem de cadastro. Retorna `null` quando não há nenhuma pessoa
 * (só empresas, ou QSA vazio) — nesse caso o hook é sem nome.
 */
export function escolherSocioPrincipal(
	socios: SocioQsa[] | null | undefined,
): SocioPrincipal | null {
	const pessoas = (socios ?? []).filter(ehPessoa);
	if (pessoas.length === 0) return null;

	const principal = [...pessoas].sort((a, b) => {
		const porPeso =
			pesoQualificacao(b.qualificacaoSocio) -
			pesoQualificacao(a.qualificacaoSocio);
		if (porPeso !== 0) return porPeso;

		const capA = a.percentualCapital ?? -1;
		const capB = b.percentualCapital ?? -1;
		if (capA !== capB) return capB - capA;

		return a.ordem - b.ordem;
	})[0];

	if (!principal) return null;

	const nome = principal.nomeSocio.trim();
	return {
		nome,
		primeiroNome: primeiroNomeDe(nome),
		qualificacao: principal.qualificacaoSocio?.trim() || null,
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
