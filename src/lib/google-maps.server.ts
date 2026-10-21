// ==========================================================================
// google-maps.server.ts — lógica 100% servidor.
// NUNCA importar este arquivo de rotas/componentes (import protection).
// O client chama via server function definida em modulo isomórfico.
// ==========================================================================

import {
	buildGooglePlaceDetailsUrl,
	buildGooglePlacesTextSearchUrl,
	type GoogleMapsServerInput,
	type GoogleMapsServerResponse,
	type GooglePlacesTextSearchParams,
	normalizarGooglePlace,
} from "./google-maps";

/**
 * Coordenadas aproximadas das principais cidades brasileiras (centro).
 * Usado como fallback para location bias quando o Operador não fornece lat/lng.
 */
const CIDADE_COORDS: Record<string, string> = {
	"Ribeirão Preto": "-21.1784,-47.8103",
	"São Paulo": "-23.5505,-46.6333",
	"Rio de Janeiro": "-22.9068,-43.1729",
	"Belo Horizonte": "-19.9167,-43.9345",
	Curitiba: "-25.4284,-49.2733",
	"Porto Alegre": "-30.0346,-51.2177",
	Salvador: "-12.9714,-38.5014",
	Fortaleza: "-3.7172,-38.5433",
	Brasília: "-15.7975,-47.8919",
	Manaus: "-3.1190,-60.0217",
	Recife: "-8.0476,-34.8770",
	Goiânia: "-16.6869,-49.2648",
	Campinas: "-22.9056,-47.0608",
	Santos: "-23.9608,-46.3331",
	"São José do Rio Preto": "-20.8113,-49.3759",
	Bauru: "-22.3147,-49.0606",
	Sorocaba: "-23.5015,-47.4526",
};

/**
 * Busca estabelecimentos locais via Google Maps Places API.
 * Chave efetiva: banco (Configurações → Integrações) > process.env.
 * Faz Text Search → para cada resultado, busca Place Details (telefone + website)
 * → normaliza para LeadGarimpado.
 *
 * Custo estimado: US$ 0.032 por Text Search + US$ 0.017 por Place Details.
 */
export async function executarGoogleMaps(
	data: GoogleMapsServerInput,
): Promise<GoogleMapsServerResponse> {
	const { getIntegracaoCredenciais, resolverChave } = await import(
		"./integracao.server"
	);
	const creds = await getIntegracaoCredenciais();
	const apiKey = resolverChave(
		creds.googleMapsApiKey,
		process.env.GOOGLE_MAPS_API_KEY,
	);

	if (!apiKey) {
		return {
			success: false,
			isMock: true,
			leads: [],
			total: 0,
			error:
				"Chave do Google Maps não configurada. Cadastre em Configurações → Integrações.",
		};
	}

	if (!data.query || data.query.trim().length < 2) {
		return {
			success: false,
			isMock: false,
			leads: [],
			total: 0,
			error:
				"Termo de busca (query) é obrigatório e deve ter no mínimo 2 caracteres.",
		};
	}

	const maxResults = Math.min(data.maxResults ?? 15, 60);
	const radius = data.radius ?? 10000;
	const cidade = data.location?.split(",")[0]?.trim();
	const centerLatLng =
		data.centerLatLng ?? (cidade ? CIDADE_COORDS[cidade] : undefined);

	const searchParams: GooglePlacesTextSearchParams = {
		query: data.query,
		location: data.location,
		centerLatLng,
		radius,
		maxResults,
		language: data.language ?? "pt-BR",
		region: data.region ?? "br",
	};

	try {
		const searchUrl = buildGooglePlacesTextSearchUrl(searchParams, apiKey);
		const searchRes = await fetch(searchUrl);

		if (!searchRes.ok) {
			return {
				success: false,
				isMock: false,
				leads: [],
				total: 0,
				error: `Google Places Text Search falhou (HTTP ${searchRes.status}).`,
			};
		}

		const searchJson = await searchRes.json();

		if (searchJson.status !== "OK" && searchJson.status !== "ZERO_RESULTS") {
			return {
				success: false,
				isMock: false,
				leads: [],
				total: 0,
				error: `Google Places Text Search: ${searchJson.status} — ${searchJson.error_message ?? "sem detalhes"}`,
			};
		}

		const candidatos: any[] = (searchJson.results ?? []).slice(0, maxResults);

		const detalhes = await Promise.all(
			candidatos.map(async (place) => {
				const detailsUrl = buildGooglePlaceDetailsUrl(
					{ placeId: place.place_id },
					apiKey,
				);
				try {
					const r = await fetch(detailsUrl);
					if (!r.ok) return place;
					const j = await r.json();
					return j.result ?? place;
				} catch {
					return place;
				}
			}),
		);

		const leads = detalhes.map((p, i) =>
			normalizarGooglePlace(p, i, cidade ?? "Ribeirão Preto"),
		);

		const costEstimate = `~US$ ${(0.032 + leads.length * 0.017).toFixed(3)}`;

		return {
			success: true,
			isMock: false,
			leads,
			total: leads.length,
			costEstimate,
			message:
				leads.length > 0
					? `${leads.length} estabelecimentos locais retornados pelo Google Maps.`
					: "Nenhum estabelecimento encontrado para esse termo nessa região.",
		};
	} catch (err: any) {
		return {
			success: false,
			isMock: false,
			leads: [],
			total: 0,
			error: `Exceção na chamada ao Google Maps: ${err.message || String(err)}`,
		};
	}
}
