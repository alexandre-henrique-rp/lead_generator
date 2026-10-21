// ==========================================================================
// lead_generator — orcamento-calc.ts
// --------------------------------------------------------------------------
// Cálculo puro de orçamento (sem IO). Usa os valores do PriceConfig.
// Regras:
//   custo_projeto = horas × custoHoraCentavos
//   piso          = custo_projeto × margemMinima               (G-02)
//   preco_bruto   = horas × precoHoraTabelaCentavos
//   desconto      = percentual OU valor fixo em centavos
//   preco_final   = max(preco_bruto - desconto, 0)
//   imposto       = preco_final × aliquotaImpostos
//   lucro         = preco_final - custo_projeto - imposto
//   G-03: abaixoDoPiso = preco_final < piso
//         bloqueado    = abaixoDoPiso && bloqueioPiso
// Todos os valores monetários são inteiros em centavos (arredondados).
// ==========================================================================

export type DescontoTipo = "PERCENTUAL" | "VALOR";

export interface OrcamentoCalcParams {
	tempoTotalHoras: number;
	custoHoraCentavos: number;
	precoHoraTabelaCentavos: number;
	margemMinima: number;
	aliquotaImpostos: number;
	bloqueioPiso: boolean;
	descontoTipo?: DescontoTipo;
	/** Se PERCENTUAL: 0..100 (ex.: 10 = 10%). Se VALOR: centavos. */
	descontoValor?: number;
}

export interface OrcamentoCalcResult {
	tempoTotalHoras: number;
	custoProjetoCentavos: number;
	pisoCentavos: number;
	precoBrutoCentavos: number;
	descontoAplicadoCentavos: number;
	precoFinalCentavos: number;
	impostoEstimadoCentavos: number;
	lucroEstimadoCentavos: number;
	abaixoDoPiso: boolean;
	bloqueado: boolean;
}

function round(n: number): number {
	return Math.round(n);
}

export function calcularOrcamento(
	params: OrcamentoCalcParams,
): OrcamentoCalcResult {
	const horas = Math.max(0, params.tempoTotalHoras || 0);

	const custoProjetoCentavos = round(horas * params.custoHoraCentavos);
	const pisoCentavos = round(custoProjetoCentavos * params.margemMinima);
	const precoBrutoCentavos = round(horas * params.precoHoraTabelaCentavos);

	let descontoAplicadoCentavos = 0;
	if (params.descontoValor && params.descontoValor > 0) {
		if (params.descontoTipo === "PERCENTUAL") {
			const pct = Math.min(Math.max(params.descontoValor, 0), 100);
			descontoAplicadoCentavos = round((precoBrutoCentavos * pct) / 100);
		} else {
			descontoAplicadoCentavos = round(params.descontoValor);
		}
	}
	descontoAplicadoCentavos = Math.min(
		descontoAplicadoCentavos,
		precoBrutoCentavos,
	);

	const precoFinalCentavos = Math.max(
		precoBrutoCentavos - descontoAplicadoCentavos,
		0,
	);

	const impostoEstimadoCentavos = round(
		precoFinalCentavos * params.aliquotaImpostos,
	);
	const lucroEstimadoCentavos =
		precoFinalCentavos - custoProjetoCentavos - impostoEstimadoCentavos;

	const abaixoDoPiso = precoFinalCentavos < pisoCentavos;
	const bloqueado = abaixoDoPiso && params.bloqueioPiso;

	return {
		tempoTotalHoras: horas,
		custoProjetoCentavos,
		pisoCentavos,
		precoBrutoCentavos,
		descontoAplicadoCentavos,
		precoFinalCentavos,
		impostoEstimadoCentavos,
		lucroEstimadoCentavos,
		abaixoDoPiso,
		bloqueado,
	};
}
