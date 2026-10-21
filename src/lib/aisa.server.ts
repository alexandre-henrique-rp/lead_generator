// ==========================================================================
// aisa.server.ts — lógica 100% servidor.
// NUNCA importar este arquivo de rotas/componentes (import protection).
// O client chama via `executarGarimpoServerFn` definida em `./aisa`.
// ==========================================================================

import {
	buildApolloPayload,
	type GarimpadoImportRow,
	type GarimpoImportResult,
	type GarimpoServerInput,
	type GarimpoServerResponse,
	normalizarApolloOrganizacao,
} from "./aisa";
import type {
	GoogleMapsServerInput,
	GoogleMapsServerResponse,
} from "./google-maps";
import { executarGoogleMaps } from "./google-maps.server";

/**
 * Executa o garimpo no servidor (Node.js/Nitro), com dispatch pelo motor.
 *
 * - motor = "APOLLO"             → AIsa Gateway → Apollo mixed_companies/search (B2B)
 * - motor = "GOOGLE_MAPS_PLACES" → Google Maps Places API direto (Text Search + Details)
 *
 * Credenciais (todas via env, nunca expostas ao client):
 *   - AISA_API_KEY         (motor APOLLO)
 *   - GOOGLE_MAPS_API_KEY  (motor GOOGLE_MAPS_PLACES)
 */
export async function executarGarimpo(
	data: GarimpoServerInput,
): Promise<GarimpoServerResponse> {
	// CSV é tratado por importarLeadsCsvServerFn (outra server function).
	// Se chegar aqui com motor === "CSV", é bug do client.
	if (data.motor === "CSV") {
		return {
			success: false,
			isMock: false,
			motor: data.motor,
			leads: [],
			total: 0,
			error:
				"Motor CSV deve usar importarLeadsCsvServerFn, não executarGarimpoServerFn.",
		};
	}

	if (data.motor === "GOOGLE_MAPS_PLACES") {
		const gmapsInput: GoogleMapsServerInput = {
			query: data.mapsKeyword || "",
			location: data.googleLocation,
			centerLatLng: data.googleCenterLatLng,
			radius: data.googleRadius,
			maxResults: data.googleMaxResults,
		};
		const r: GoogleMapsServerResponse = await executarGoogleMaps(gmapsInput);
		return { ...r, motor: "GOOGLE_MAPS_PLACES" };
	}

	// APOLLO — chave efetiva: banco (Configurações → Integrações) > env.
	const { getIntegracaoCredenciais, resolverChave } = await import(
		"./integracao.server"
	);
	const creds = await getIntegracaoCredenciais();
	const apiKey = resolverChave(creds.aisaApiKey, process.env.AISA_API_KEY);

	if (!apiKey || !apiKey.startsWith("sk-")) {
		return {
			success: false,
			isMock: true,
			motor: data.motor,
			leads: [],
			total: 0,
			error:
				"Chave da AIsa não configurada. Cadastre em Configurações → Integrações.",
		};
	}

	try {
		const payload = buildApolloPayload({
			palavrasChave: data.tags || [],
			localizacao:
				data.localizacaoApollo || "Ribeirão Preto, São Paulo, Brazil",
			perPage: data.perPage || 15,
		});

		const res = await fetch(
			"https://api.aisa.one/apis/v1/apollo/mixed_companies/search",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			},
		);

		if (!res.ok) {
			const erroTexto = await res.text();
			return {
				success: false,
				isMock: false,
				motor: data.motor,
				leads: [],
				total: 0,
				error: `Erro retornado pela API Apollo (${res.status}): ${erroTexto}`,
			};
		}

		const json = await res.json();
		const leads = (json.organizations || []).map(normalizarApolloOrganizacao);

		return {
			success: true,
			isMock: false,
			motor: data.motor,
			leads,
			total: leads.length,
			costEstimate: `~US$ ${(leads.length * 0.019).toFixed(3)}`,
			message: `${leads.length} empresas B2B retornadas com sucesso pelo servidor.`,
		};
	} catch (err: any) {
		return {
			success: false,
			isMock: false,
			motor: data.motor,
			leads: [],
			total: 0,
			error: `Exceção na chamada de servidor: ${err.message || String(err)}`,
		};
	}
}

/**
 * Persiste leads garimpados (Apollo / Google Maps) na tabela Lead.
 *
 * Dedup: telefone normalizado → nome+cidade (fallback para itens sem
 * telefone). Se existir, atualiza mantendo dados já cadastrados; se não
 * existir, cria com origem "MAPS" e etapa NOVO. Celular (11 dígitos) é
 * proxy para WhatsApp — mesma convenção do resto do app.
 */
export async function importarGarimpados(
	leads: GarimpadoImportRow[],
): Promise<GarimpoImportResult> {
	const { prisma } = await import("#/db");

	let importados = 0;
	let atualizados = 0;
	const erros: GarimpoImportResult["erros"] = [];

	for (const g of leads) {
		const telefoneNorm = (g.telefone ?? "").replace(/\D/g, "") || null;
		const telefoneCelular =
			telefoneNorm && telefoneNorm.length >= 11 ? telefoneNorm : null;
		const telefoneFixo =
			telefoneNorm && telefoneNorm.length === 10 ? telefoneNorm : null;
		const website = g.dominio
			? g.dominio.startsWith("http")
				? g.dominio
				: `https://${g.dominio}`
			: null;
		const cidade = g.cidade || null;
		const uf = g.estado || null;
		const observacoes =
			[g.setor, g.porteFuncionarios].filter(Boolean).join(" · ") || null;

		try {
			const existente =
				(telefoneNorm
					? await prisma.lead.findFirst({ where: { telefoneNorm } })
					: null) ??
				(await prisma.lead.findFirst({
					where: { nome: g.nome, cidade },
				}));

			if (existente) {
				await prisma.lead.update({
					where: { id: existente.id },
					data: {
						nome: g.nome,
						razaoSocial: g.razaoSocial ?? existente.razaoSocial,
						telefone: telefoneNorm ?? existente.telefone,
						telefoneNorm: telefoneNorm ?? existente.telefoneNorm,
						telefoneCelular: telefoneCelular ?? existente.telefoneCelular,
						telefoneFixo: telefoneFixo ?? existente.telefoneFixo,
						temWhatsapp: existente.temWhatsapp || telefoneCelular != null,
						cidade: cidade ?? existente.cidade,
						uf: uf ?? existente.uf,
						website: website ?? existente.website,
					},
				});
				atualizados += 1;
			} else {
				await prisma.lead.create({
					data: {
						nome: g.nome,
						razaoSocial: g.razaoSocial,
						telefone: telefoneNorm,
						telefoneNorm,
						telefoneCelular,
						telefoneFixo,
						temWhatsapp: telefoneCelular != null,
						cidade,
						uf,
						website,
						observacoes,
						origem: "MAPS",
						etapaFunil: "NOVO",
					},
				});
				importados += 1;
			}
		} catch (err: any) {
			erros.push({
				nome: g.nome,
				motivo: `Falha ao persistir: ${err.message ?? String(err)}`,
			});
		}
	}

	return { importados, atualizados, erros };
}
