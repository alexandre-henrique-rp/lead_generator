/**
 * Funções puras de máscara e validação para documentos e contatos brasileiros.
 */

/**
 * Remove todos os caracteres não numéricos.
 */
export function onlyDigits(val: string | null | undefined): string {
	if (!val) return "";
	return val.replace(/\D/g, "");
}

/**
 * Aplica máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) dinamicamente.
 */
export function maskCpfCnpj(val: string | null | undefined): string {
	const digits = onlyDigits(val);
	if (digits.length <= 11) {
		// CPF
		return digits
			.replace(/(\d{3})(\d)/, "$1.$2")
			.replace(/(\d{3})(\d)/, "$1.$2")
			.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
	}
	// CNPJ
	return digits
		.slice(0, 14)
		.replace(/^(\d{2})(\d)/, "$1.$2")
		.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
		.replace(/\.(\d{3})(\d)/, ".$1/$2")
		.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/**
 * Aplica máscara de telefone fixo (10 dígitos) ou celular/WhatsApp (11 dígitos).
 * (16) 99602-9107 ou (16) 3600-0000
 */
export function maskPhone(val: string | null | undefined): string {
	const digits = onlyDigits(val).slice(0, 11);
	if (digits.length <= 10) {
		return digits
			.replace(/^(\d{2})(\d)/, "($1) $2")
			.replace(/(\d{4})(\d{1,4})$/, "$1-$2");
	}
	return digits
		.replace(/^(\d{2})(\d)/, "($1) $2")
		.replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

/**
 * Aplica máscara de CEP (00000-000).
 */
export function maskCep(val: string | null | undefined): string {
	const digits = onlyDigits(val).slice(0, 8);
	return digits.replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
}

/**
 * Validação do dígito verificador de CPF.
 */
export function isValidCpf(cpfRaw: string | null | undefined): boolean {
	const cpf = onlyDigits(cpfRaw);
	if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

	const digits = cpf.split("").map((el) => Number.parseInt(el, 10));

	const getRest = (count: number) =>
		((digits
			.slice(0, count - 12)
			.reduce((soma, el, index) => soma + el * (count - index), 0) *
			10) %
			11) %
		10;

	return getRest(10) === digits[9] && getRest(11) === digits[10];
}

/**
 * Validação dos dígitos verificadores de CNPJ.
 */
export function isValidCnpj(cnpjRaw: string | null | undefined): boolean {
	const cnpj = onlyDigits(cnpjRaw);
	if (cnpj.length !== 14 || !!cnpj.match(/(\d)\1{13}/)) return false;

	const t = cnpj.length - 2;
	const d = cnpj.substring(t);
	const d1 = Number.parseInt(d.charAt(0), 10);
	const d2 = Number.parseInt(d.charAt(1), 10);

	const calc = (x: number) => {
		const n = cnpj.substring(0, x);
		let y = x - 7;
		let s = 0;
		let r = 0;
		for (let i = x; i >= 1; i--) {
			s += Number.parseInt(n.charAt(x - i), 10) * y--;
			if (y < 2) y = 9;
		}
		r = 11 - (s % 11);
		return r > 9 ? 0 : r;
	};

	return calc(t) === d1 && calc(t + 1) === d2;
}
