/**
 * Parser de CSV no formato brasileiro:
 * - separador: `;`
 * - aspas duplas `"` envolvendo campos
 * - primeira linha = cabeçalho
 *
 * Formato esperado:
 *   "razao_social";"nome_titular";"email";"telefone"
 *   "";VERIDIANA STEFANI;contato@profeveridiana.com;"11985191153"
 */

export interface CsvLeadRow {
	linha: number; // 1-indexed, 1 = cabeçalho
	razao_social: string;
	nome_titular: string;
	email: string;
	telefone: string;
}

export interface CsvParseResult {
	ok: boolean;
	cabecalho: string[];
	linhas: CsvLeadRow[];
	erros: { linha: number; motivo: string }[];
}

/**
 * Divide uma string CSV em campos, respeitando aspas duplas.
 * Suporta aspas escapadas como "" (duas aspas dentro de campo).
 */
export function parsearLinhaCsv(linha: string, sep = ";"): string[] {
	const campos: string[] = [];
	let atual = "";
	let dentroAspas = false;
	let i = 0;

	while (i < linha.length) {
		const ch = linha[i];

		if (dentroAspas) {
			if (ch === '"') {
				if (linha[i + 1] === '"') {
					// aspa escapada
					atual += '"';
					i += 2;
					continue;
				}
				dentroAspas = false;
				i += 1;
				continue;
			}
			atual += ch;
			i += 1;
			continue;
		}

		if (ch === '"') {
			dentroAspas = true;
			i += 1;
			continue;
		}

		if (ch === sep) {
			campos.push(atual);
			atual = "";
			i += 1;
			continue;
		}

		atual += ch;
		i += 1;
	}

	campos.push(atual);
	return campos.map((c) => c.trim());
}

/**
 * Conta quantas linhas de dados existem no CSV (excluindo o cabeçalho).
 * Linhas em branco são ignoradas.
 *
 * Exemplo: "a;b\n1;2\n3;4\n\n5;6\n" → 3
 */
export function contarLinhas(conteudo: string): number {
	const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim().length > 0);
	return Math.max(0, linhas.length - 1);
}

/**
 * Formata tamanho em bytes para string legível (B / KB / MB / GB).
 */
export function formatarTamanho(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
	return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Faz o parse completo de um CSV (texto).
 * Retorna cabeçalho, linhas válidas e linhas com erro de formato.
 */
export function parsearCsv(conteudo: string, sep = ";"): CsvParseResult {
	const linhasBrutas = conteudo
		.split(/\r?\n/)
		.filter((l) => l.trim().length > 0);

	if (linhasBrutas.length === 0) {
		return {
			ok: false,
			cabecalho: [],
			linhas: [],
			erros: [{ linha: 0, motivo: "Arquivo vazio" }],
		};
	}

	const cabecalho = parsearLinhaCsv(linhasBrutas[0], sep).map((h) =>
		h.toLowerCase().trim(),
	);

	const camposEsperados = ["razao_social", "nome_titular", "email", "telefone"];
	const camposFaltando = camposEsperados.filter((c) => !cabecalho.includes(c));
	if (camposFaltando.length > 0) {
		return {
			ok: false,
			cabecalho,
			linhas: [],
			erros: [
				{
					linha: 1,
					motivo: `Cabeçalho inválido. Faltando: ${camposFaltando.join(", ")}. Esperado: ${camposEsperados.join(";")}`,
				},
			],
		};
	}

	const idxRazao = cabecalho.indexOf("razao_social");
	const idxNome = cabecalho.indexOf("nome_titular");
	const idxEmail = cabecalho.indexOf("email");
	const idxTelefone = cabecalho.indexOf("telefone");

	const linhas: CsvLeadRow[] = [];
	const erros: { linha: number; motivo: string }[] = [];

	for (let i = 1; i < linhasBrutas.length; i += 1) {
		const numeroLinha = i + 1;
		const campos = parsearLinhaCsv(linhasBrutas[i], sep);
		if (campos.length < camposEsperados.length) {
			erros.push({
				linha: numeroLinha,
				motivo: `Linha com ${campos.length} campos (esperado ${camposEsperados.length})`,
			});
			continue;
		}
		const row: CsvLeadRow = {
			linha: numeroLinha,
			razao_social: campos[idxRazao] ?? "",
			nome_titular: campos[idxNome] ?? "",
			email: campos[idxEmail] ?? "",
			telefone: campos[idxTelefone] ?? "",
		};
		// Só descarta se a linha não tiver NENHUM dado útil.
		// Linha com telefone/e-mail mas sem nome ainda é um lead válido
		// (normalizarLinhaCsv usa "(sem nome)" como fallback).
		if (!row.nome_titular && !row.razao_social && !row.email && !row.telefone) {
			erros.push({
				linha: numeroLinha,
				motivo: "Linha sem nenhum dado de contato",
			});
			continue;
		}
		linhas.push(row);
	}

	return { ok: true, cabecalho, linhas, erros };
}

/**
 * Normaliza uma linha do CSV para o shape de Lead (banco).
 * Aplica fallback razao_social → nome e valida e-mail.
 */
export interface CsvLeadNormalizado {
	nome: string;
	razaoSocial: string | null;
	email: string | null;
	telefone: string | null;
	telefoneNorm: string | null;
	origem: "CSV";
}

// ---- importação de leads via CSV -------------------------------------------

export interface CsvImportErro {
	linha: number;
	razao_social: string;
	motivo: string;
}

export interface CsvImportResponse {
	success: boolean;
	filePath?: string;
	fileName?: string;
	fileSize?: number;
	totalLinhas: number;
	importados: number;
	atualizados: number;
	erros: CsvImportErro[];
	message: string;
}

/** Resultado de um lote de linhas processadas (dedup + upsert). */
export interface CsvLoteResult {
	importados: number;
	atualizados: number;
	erros: CsvImportErro[];
}

/** Info do CSV no caminho fixo do disco (para preview antes de importar). */
export interface CsvDiscoInfo {
	ok: boolean;
	filePath?: string;
	fileSize?: number;
	totalLinhas: number;
	motivo?: string;
}

/** Input de um lote de importação do CSV em disco. */
export interface CsvDiscoLoteInput {
	offset: number;
	limit: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarLinhaCsv(row: CsvLeadRow): CsvLeadNormalizado {
	const nome =
		row.nome_titular?.trim() || row.razao_social?.trim() || "(sem nome)";
	const razaoSocial = row.razao_social?.trim() || null;
	const email = row.email?.trim() || null;
	const telefone = row.telefone?.trim() || null;
	const telefoneNorm = telefone ? telefone.replace(/\D/g, "") || null : null;

	return {
		nome,
		razaoSocial,
		email: email && EMAIL_RE.test(email) ? email : null,
		telefone,
		telefoneNorm,
		origem: "CSV",
	};
}
