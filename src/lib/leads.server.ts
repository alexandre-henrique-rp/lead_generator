// ==========================================================================
// leads.server.ts — acesso ao banco (prisma). Lógica 100% servidor.
// Carregado via `await import()` dentro dos handlers de `./leads` para
// não vazar prisma pro bundle do client.
// ==========================================================================

import type { Lead, Prisma, Socio } from "../generated/prisma/client.js";
import type {
	CriarLeadInput,
	LeadDetalhe,
	LeadItem,
	LeadsPageResult,
	ListarLeadsInput,
	SocioDetalhe,
} from "./leads";

/** Origens reconhecidas pela UI — qualquer outra vira "CSV" por segurança. */
const ORIGENS = new Set(["MAPS", "CSV", "MANUAL", "SITE"]);

function leadDbParaItem(lead: Lead): LeadItem {
	const telefoneNorm = lead.telefoneNorm ?? "";
	return {
		id: lead.uuid,
		nome: lead.nome,
		razaoSocial: lead.razaoSocial ?? undefined,
		cnpj: lead.cnpj ?? undefined,
		etapa: lead.etapaFunil,
		telefone: telefoneNorm || lead.telefone || "",
		telefoneCelular: lead.telefoneCelular ?? (telefoneNorm || undefined),
		telefoneFixo: lead.telefoneFixo ?? undefined,
		temWhatsapp: lead.temWhatsapp,
		origem: ORIGENS.has(lead.origem)
			? (lead.origem as LeadItem["origem"])
			: "CSV",
		createdAt: lead.createdAt.toISOString(),
		cidade: lead.cidade ?? "",
	};
}

function leadDbParaDetalhe(lead: Lead & { socios?: Socio[] }): LeadDetalhe {
	const base = leadDbParaItem(lead);
	let emails: string[] | undefined;
	if (lead.emails) {
		try {
			emails = JSON.parse(lead.emails);
		} catch {
			emails = undefined;
		}
	}
	let cnaesSecundarios: LeadDetalhe["cnaesSecundarios"];
	if (lead.jsonCnaesSecundarios) {
		try {
			cnaesSecundarios = JSON.parse(lead.jsonCnaesSecundarios);
		} catch {
			cnaesSecundarios = undefined;
		}
	}
	let regimeTributario: LeadDetalhe["regimeTributario"];
	if (lead.jsonRegimeTributario) {
		try {
			regimeTributario = JSON.parse(lead.jsonRegimeTributario);
		} catch {
			regimeTributario = undefined;
		}
	}

	let qsa: SocioDetalhe[] | undefined;
	if (lead.socios && lead.socios.length > 0) {
		qsa = lead.socios.map((s) => ({
			id: s.id,
			uuid: s.uuid,
			nomeSocio: s.nomeSocio,
			cnpjCpfDoSocio: s.cnpjCpfDoSocio ?? undefined,
			qualificacaoSocio: s.qualificacaoSocio ?? undefined,
			faixaEtaria: s.faixaEtaria ?? undefined,
			dataEntradaSociedade: s.dataEntradaSociedade?.toISOString() ?? undefined,
			cpfRepresentanteLegal: s.cpfRepresentanteLegal ?? undefined,
			nomeRepresentanteLegal: s.nomeRepresentanteLegal ?? undefined,
			qualificacaoRepresentanteLegal:
				s.qualificacaoRepresentanteLegal ?? undefined,
		}));
	} else if (lead.jsonQsa) {
		try {
			qsa = JSON.parse(lead.jsonQsa);
		} catch {
			qsa = undefined;
		}
	}

	return {
		...base,
		cpf: lead.cpf ?? undefined,
		cep: lead.cep ?? undefined,
		logradouro: lead.logradouro ?? undefined,
		numero: lead.numero ?? undefined,
		bairro: lead.bairro ?? undefined,
		uf: lead.uf ?? undefined,
		complemento: lead.complemento ?? undefined,
		tipoLogradouro: lead.tipoLogradouro ?? undefined,
		emails,
		origemRaw: lead.origem,
		observacoes: lead.observacoes ?? undefined,
		score: lead.score ?? undefined,
		updatedAt: lead.updatedAt.toISOString(),
		// inteligência comercial & website
		website: lead.website ?? undefined,
		faturamentoPresumido: lead.faturamentoPresumido ?? undefined,
		quantidadeFuncionarios: lead.quantidadeFuncionarios ?? undefined,
		capitalSocial: lead.capitalSocial ?? undefined,
		situacaoEspecial: lead.situacaoEspecial ?? undefined,
		dataSituacaoEspecial: lead.dataSituacaoEspecial?.toISOString() ?? undefined,
		enteFederativoResponsavel: lead.enteFederativoResponsavel ?? undefined,
		nomeCidadeNoExterior: lead.nomeCidadeNoExterior ?? undefined,
		pais: lead.pais ?? undefined,
		codigoPais: lead.codigoPais ?? undefined,
		dddFax: lead.dddFax ?? undefined,
		descricaoMotivoSituacaoCadastral:
			lead.descricaoMotivoSituacaoCadastral ?? undefined,
		// enriquecimento CNPJ
		nomeFantasia: lead.nomeFantasia ?? undefined,
		identificadorMatrizFilial: lead.identificadorMatrizFilial ?? undefined,
		descricaoMatrizFilial: lead.descricaoMatrizFilial ?? undefined,
		situacaoCadastral: lead.situacaoCadastral ?? undefined,
		descricaoSituacaoCadastral: lead.descricaoSituacaoCadastral ?? undefined,
		dataSituacaoCadastral:
			lead.dataSituacaoCadastral?.toISOString() ?? undefined,
		motivoSituacaoCadastral: lead.motivoSituacaoCadastral ?? undefined,
		dataInicioAtividade: lead.dataInicioAtividade?.toISOString() ?? undefined,
		cnaeFiscal: lead.cnaeFiscal ?? undefined,
		cnaeFiscalDescricao: lead.cnaeFiscalDescricao ?? undefined,
		codigoNaturezaJuridica: lead.codigoNaturezaJuridica ?? undefined,
		naturezaJuridica: lead.naturezaJuridica ?? undefined,
		capitalSocialCentavos: lead.capitalSocialCentavos ?? undefined,
		porte: lead.porte ?? undefined,
		codigoPorte: lead.codigoPorte ?? undefined,
		descricaoPorte: lead.descricaoPorte ?? undefined,
		codigoMunicipio: lead.codigoMunicipio ?? undefined,
		codigoMunicipioIbge: lead.codigoMunicipioIbge ?? undefined,
		municipio: lead.municipio ?? undefined,
		dddTelefone1: lead.dddTelefone1 ?? undefined,
		dddTelefone2: lead.dddTelefone2 ?? undefined,
		telefoneCelular:
			lead.telefoneCelular ??
			(lead.telefoneNorm && lead.telefoneNorm.length >= 11
				? lead.telefoneNorm
				: undefined),
		telefoneFixo:
			lead.telefoneFixo ??
			(lead.telefoneNorm && lead.telefoneNorm.length === 10
				? lead.telefoneNorm
				: lead.dddTelefone1 || undefined),
		emailCnpj: lead.emailCnpj ?? undefined,
		email: lead.email ?? undefined,
		opcaoPeloMei: lead.opcaoPeloMei ?? undefined,
		dataOpcaoPeloMei: lead.dataOpcaoPeloMei?.toISOString() ?? undefined,
		dataExclusaoDoMei: lead.dataExclusaoDoMei?.toISOString() ?? undefined,
		opcaoPeloSimples: lead.opcaoPeloSimples ?? undefined,
		dataOpcaoPeloSimples: lead.dataOpcaoPeloSimples?.toISOString() ?? undefined,
		dataExclusaoDoSimples:
			lead.dataExclusaoDoSimples?.toISOString() ?? undefined,
		qualificacaoResponsavel: lead.qualificacaoResponsavel ?? undefined,
		dataUltimaConsultaCnpj:
			lead.dataUltimaConsultaCnpj?.toISOString() ?? undefined,
		cnaesSecundarios,
		regimeTributario,
		qsa,
	};
}

async function getPrisma() {
	const mod = await import("#/db");
	return mod.prisma;
}

export async function listarLeads(
	input: ListarLeadsInput,
): Promise<LeadsPageResult> {
	const prisma = await getPrisma();
	const { page, pageSize, busca, etapa, origem } = input;
	const q = busca.trim();

	const where: Prisma.LeadWhereInput = {
		isActive: true,
		...(etapa !== "ALL" && { etapaFunil: etapa }),
		...(origem !== "ALL" && { origem }),
		...(q && {
			OR: [
				{ nome: { contains: q } },
				{ razaoSocial: { contains: q } },
				{ cnpj: { contains: q } },
				{ telefoneNorm: { contains: q } },
			],
		}),
	};

	const [total, rows, porEtapa] = await Promise.all([
		prisma.lead.count({ where }),
		prisma.lead.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		prisma.lead.groupBy({
			by: ["etapaFunil"],
			where: { isActive: true },
			_count: { _all: true },
		}),
	]);

	const contagem = new Map(porEtapa.map((g) => [g.etapaFunil, g._count._all]));
	const totalGeral = [...contagem.values()].reduce((acc, n) => acc + n, 0);

	return {
		items: rows.map(leadDbParaItem),
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize)),
		metricas: {
			total: totalGeral,
			novos: contagem.get("NOVO") ?? 0,
			qualificados: contagem.get("QUALIFICADO") ?? 0,
			propostas: contagem.get("PROPOSTA_ENVIADA") ?? 0,
		},
	};
}

export async function getLeadByUuid(uuid: string): Promise<LeadDetalhe | null> {
	const prisma = await getPrisma();
	const row = await prisma.lead.findUnique({
		where: { uuid },
		include: {
			socios: {
				orderBy: { ordem: "asc" },
			},
		},
	});
	if (!row || !row.isActive) return null;
	return leadDbParaDetalhe(row);
}

export interface UpdateLeadInput {
	uuid: string;
	nome?: string;
	razaoSocial?: string | null;
	nomeFantasia?: string | null;
	cnpj?: string | null;
	telefone?: string | null;
	telefoneCelular?: string | null;
	telefoneFixo?: string | null;
	telefoneNorm?: string | null;
	temWhatsapp?: boolean;
	cidade?: string | null;
	uf?: string | null;
	cep?: string | null;
	logradouro?: string | null;
	numero?: string | null;
	bairro?: string | null;
	complemento?: string | null;
	tipoLogradouro?: string | null;
	website?: string | null;
	etapa?: string;
	observacoes?: string | null;
	// Enriquecimento do CNPJ
	situacaoCadastral?: number | null;
	descricaoSituacaoCadastral?: string | null;
	dataSituacaoCadastral?: string | null;
	motivoSituacaoCadastral?: string | null;
	descricaoMotivoSituacaoCadastral?: string | null;
	dataInicioAtividade?: string | null;
	cnaeFiscal?: number | null;
	cnaeFiscalDescricao?: string | null;
	naturezaJuridica?: string | null;
	codigoNaturezaJuridica?: number | null;
	porte?: string | null;
	codigoPorte?: number | null;
	descricaoPorte?: string | null;
	capitalSocial?: number | null;
	faturamentoPresumido?: string | null;
	quantidadeFuncionarios?: number | null;
	identificadorMatrizFilial?: number | null;
	descricaoMatrizFilial?: string | null;
	opcaoPeloSimples?: boolean | null;
	opcaoPeloMei?: boolean | null;
	dataOpcaoPeloSimples?: string | null;
	dataExclusaoDoSimples?: string | null;
	dataOpcaoPeloMei?: string | null;
	dataExclusaoDoMei?: string | null;
	emailCnpj?: string | null;
	email?: string | null;
	dddTelefone1?: string | null;
	dddTelefone2?: string | null;
	dddFax?: string | null;
	situacaoEspecial?: string | null;
	dataSituacaoEspecial?: string | null;
	enteFederativoResponsavel?: string | null;
	cnaesSecundarios?: Array<{ codigo: number; descricao: string }>;
	regimeTributario?: Array<{
		ano: number;
		forma_de_tributacao: string;
		quantidade_de_escrituracoes: number;
	}>;
	qsa?: Array<{
		nomeSocio: string;
		cnpjCpfDoSocio?: string | null;
		qualificacaoSocio?: string | null;
		faixaEtaria?: string | null;
		dataEntradaSociedade?: string | null;
		cpfRepresentanteLegal?: string | null;
		nomeRepresentanteLegal?: string | null;
		qualificacaoRepresentanteLegal?: string | null;
	}>;
}

export async function updateLead(
	data: UpdateLeadInput,
): Promise<LeadDetalhe | null> {
	const prisma = await getPrisma();
	const { uuid, telefone, telefoneNorm: telefoneNormInput, ...rest } = data;
	const telefoneNorm =
		telefoneNormInput !== undefined
			? telefoneNormInput
			: telefone
				? telefone.replace(/\D/g, "") || null
				: undefined;

	const leadAtual = await prisma.lead.findUnique({
		where: { uuid },
		select: { id: true },
	});
	if (!leadAtual) return null;

	// Sincroniza Quadro Societário (QSA) se enviado
	if (rest.qsa !== undefined) {
		await prisma.socio.deleteMany({ where: { leadId: leadAtual.id } });
		if (rest.qsa && rest.qsa.length > 0) {
			await prisma.socio.createMany({
				data: rest.qsa.map((s, idx) => ({
					leadId: leadAtual.id,
					nomeSocio: s.nomeSocio,
					cnpjCpfDoSocio: s.cnpjCpfDoSocio || null,
					qualificacaoSocio: s.qualificacaoSocio || null,
					faixaEtaria: s.faixaEtaria || null,
					dataEntradaSociedade: s.dataEntradaSociedade
						? new Date(s.dataEntradaSociedade)
						: null,
					cpfRepresentanteLegal: s.cpfRepresentanteLegal || null,
					nomeRepresentanteLegal: s.nomeRepresentanteLegal || null,
					qualificacaoRepresentanteLegal:
						s.qualificacaoRepresentanteLegal || null,
					ordem: idx,
				})),
			});
		}
	}

	const row = await prisma.lead.update({
		where: { uuid },
		data: {
			...(rest.nome !== undefined && { nome: rest.nome }),
			...(rest.razaoSocial !== undefined && {
				razaoSocial: rest.razaoSocial,
			}),
			...(rest.nomeFantasia !== undefined && {
				nomeFantasia: rest.nomeFantasia,
			}),
			...(rest.cnpj !== undefined && { cnpj: rest.cnpj }),
			...(telefone !== undefined && { telefone }),
			...(telefoneNorm !== undefined && { telefoneNorm }),
			...(rest.telefoneCelular !== undefined && {
				telefoneCelular: rest.telefoneCelular,
			}),
			...(rest.telefoneFixo !== undefined && {
				telefoneFixo: rest.telefoneFixo,
			}),
			...(rest.temWhatsapp !== undefined && {
				temWhatsapp: rest.temWhatsapp,
			}),
			...(rest.cidade !== undefined && { cidade: rest.cidade }),
			...(rest.uf !== undefined && { uf: rest.uf }),
			...(rest.cep !== undefined && { cep: rest.cep }),
			...(rest.logradouro !== undefined && { logradouro: rest.logradouro }),
			...(rest.numero !== undefined && { numero: rest.numero }),
			...(rest.bairro !== undefined && { bairro: rest.bairro }),
			...(rest.complemento !== undefined && { complemento: rest.complemento }),
			...(rest.tipoLogradouro !== undefined && {
				tipoLogradouro: rest.tipoLogradouro,
			}),
			...(rest.website !== undefined && { website: rest.website }),
			...(rest.etapa !== undefined && { etapaFunil: rest.etapa }),
			...(rest.observacoes !== undefined && {
				observacoes: rest.observacoes,
			}),
			// Enriquecimento do CNPJ
			...(rest.situacaoCadastral !== undefined && {
				situacaoCadastral: rest.situacaoCadastral,
			}),
			...(rest.descricaoSituacaoCadastral !== undefined && {
				descricaoSituacaoCadastral: rest.descricaoSituacaoCadastral,
			}),
			...(rest.dataSituacaoCadastral !== undefined && {
				dataSituacaoCadastral: rest.dataSituacaoCadastral
					? new Date(rest.dataSituacaoCadastral)
					: null,
			}),
			...(rest.motivoSituacaoCadastral !== undefined && {
				motivoSituacaoCadastral: rest.motivoSituacaoCadastral,
			}),
			...(rest.descricaoMotivoSituacaoCadastral !== undefined && {
				descricaoMotivoSituacaoCadastral: rest.descricaoMotivoSituacaoCadastral,
			}),
			...(rest.dataInicioAtividade !== undefined && {
				dataInicioAtividade: rest.dataInicioAtividade
					? new Date(rest.dataInicioAtividade)
					: null,
			}),
			...(rest.cnaeFiscal !== undefined && { cnaeFiscal: rest.cnaeFiscal }),
			...(rest.cnaeFiscalDescricao !== undefined && {
				cnaeFiscalDescricao: rest.cnaeFiscalDescricao,
			}),
			...(rest.naturezaJuridica !== undefined && {
				naturezaJuridica: rest.naturezaJuridica,
			}),
			...(rest.codigoNaturezaJuridica !== undefined && {
				codigoNaturezaJuridica: rest.codigoNaturezaJuridica,
			}),
			...(rest.porte !== undefined && { porte: rest.porte }),
			...(rest.codigoPorte !== undefined && {
				codigoPorte: rest.codigoPorte,
			}),
			...(rest.descricaoPorte !== undefined && {
				descricaoPorte: rest.descricaoPorte,
			}),
			...(rest.capitalSocial !== undefined && {
				capitalSocial: rest.capitalSocial,
			}),
			...(rest.faturamentoPresumido !== undefined && {
				faturamentoPresumido: rest.faturamentoPresumido,
			}),
			...(rest.quantidadeFuncionarios !== undefined && {
				quantidadeFuncionarios: rest.quantidadeFuncionarios,
			}),
			...(rest.identificadorMatrizFilial !== undefined && {
				identificadorMatrizFilial: rest.identificadorMatrizFilial,
			}),
			...(rest.descricaoMatrizFilial !== undefined && {
				descricaoMatrizFilial: rest.descricaoMatrizFilial,
			}),
			...(rest.opcaoPeloSimples !== undefined && {
				opcaoPeloSimples: rest.opcaoPeloSimples,
			}),
			...(rest.opcaoPeloMei !== undefined && {
				opcaoPeloMei: rest.opcaoPeloMei,
			}),
			...(rest.dataOpcaoPeloSimples !== undefined && {
				dataOpcaoPeloSimples: rest.dataOpcaoPeloSimples
					? new Date(rest.dataOpcaoPeloSimples)
					: null,
			}),
			...(rest.dataExclusaoDoSimples !== undefined && {
				dataExclusaoDoSimples: rest.dataExclusaoDoSimples
					? new Date(rest.dataExclusaoDoSimples)
					: null,
			}),
			...(rest.dataOpcaoPeloMei !== undefined && {
				dataOpcaoPeloMei: rest.dataOpcaoPeloMei
					? new Date(rest.dataOpcaoPeloMei)
					: null,
			}),
			...(rest.dataExclusaoDoMei !== undefined && {
				dataExclusaoDoMei: rest.dataExclusaoDoMei
					? new Date(rest.dataExclusaoDoMei)
					: null,
			}),
			...(rest.emailCnpj !== undefined && { emailCnpj: rest.emailCnpj }),
			...(rest.email !== undefined && { email: rest.email }),
			...(rest.dddTelefone1 !== undefined && {
				dddTelefone1: rest.dddTelefone1,
			}),
			...(rest.dddTelefone2 !== undefined && {
				dddTelefone2: rest.dddTelefone2,
			}),
			...(rest.dddFax !== undefined && { dddFax: rest.dddFax }),
			...(rest.situacaoEspecial !== undefined && {
				situacaoEspecial: rest.situacaoEspecial,
			}),
			...(rest.dataSituacaoEspecial !== undefined && {
				dataSituacaoEspecial: rest.dataSituacaoEspecial
					? new Date(rest.dataSituacaoEspecial)
					: null,
			}),
			...(rest.enteFederativoResponsavel !== undefined && {
				enteFederativoResponsavel: rest.enteFederativoResponsavel,
			}),
			...(rest.cnaesSecundarios !== undefined && {
				jsonCnaesSecundarios: JSON.stringify(rest.cnaesSecundarios),
			}),
			...(rest.regimeTributario !== undefined && {
				jsonRegimeTributario: JSON.stringify(rest.regimeTributario),
			}),
			...(rest.qsa !== undefined && {
				jsonQsa: JSON.stringify(rest.qsa),
			}),
		},
		include: {
			socios: {
				orderBy: { ordem: "asc" },
			},
		},
	});
	return leadDbParaDetalhe(row);
}

/**
 * Cria lead manual. Se já existir um lead com o mesmo telefone
 * normalizado, retorna o existente (dedup consistente com o import CSV).
 */
export async function criarLead(data: CriarLeadInput): Promise<LeadItem> {
	const prisma = await getPrisma();
	const telefoneNorm = data.telefone.replace(/\D/g, "") || null;

	if (telefoneNorm) {
		const existente = await prisma.lead.findFirst({ where: { telefoneNorm } });
		if (existente) return leadDbParaItem(existente);
	}

	const lead = await prisma.lead.create({
		data: {
			nome: data.nome,
			telefone: data.telefone,
			telefoneNorm,
			cnpj: data.cnpj || null,
			cidade: data.cidade || null,
			origem: "MANUAL",
			etapaFunil: "NOVO",
		},
	});

	return leadDbParaItem(lead);
}

/**
 * Exclui o lead e seus relacionamentos em transação. Projetos não são
 * excluídos — apenas desvinculados (FK SetNull), pois guardam dados
 * financeiros independentes do lead.
 */
export async function excluirLead(uuid: string): Promise<{ nome: string }> {
	if (!uuid) {
		throw new Error(
			"UUID do lead ausente. Recarregue a página e tente novamente.",
		);
	}
	const prisma = await getPrisma();

	const lead = await prisma.lead.findUnique({
		where: { uuid },
		select: { id: true, nome: true },
	});
	if (!lead) {
		throw new Error("Lead não encontrado — já removido anteriormente.");
	}

	await prisma.$transaction([
		prisma.socio.deleteMany({ where: { leadId: lead.id } }),
		prisma.cnpjConsulta.deleteMany({ where: { leadId: lead.id } }),
		prisma.projeto.updateMany({
			where: { leadId: lead.id },
			data: { leadId: null },
		}),
		prisma.lead.delete({ where: { id: lead.id } }),
	]);

	return { nome: lead.nome };
}
