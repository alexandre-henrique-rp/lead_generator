// ==========================================================================
// places.server.ts — Google Places API (Text Search + Place Details).
// Server-only. Usado como fallback de pesquisa quando Gemini está sem
// cota ou quando a busca grounding falha.
// Doc: https://developers.google.com/maps/documentation/places/web-service
// ==========================================================================

export interface PlaceResult {
	nome: string;
	endereco: string | null;
	telefone: string | null;
	website: string | null;
	rating: number | null;
	totalAvaliacoes: number | null;
	categorias: string[];
	horario: string | null;
	placeId: string;
	mapaUrl: string | null;
}

interface PlacesTextSearchResponse {
	status: string;
	error_message?: string;
	results?: Array<{
		place_id: string;
		name: string;
		formatted_address?: string;
		types?: string[];
		geometry?: { location?: { lat: number; lng: number } };
	}>;
}

interface PlacesDetailsResponse {
	status: string;
	error_message?: string;
	result?: {
		name?: string;
		formatted_address?: string;
		formatted_phone_number?: string;
		international_phone_number?: string;
		website?: string;
		rating?: number;
		user_ratings_total?: number;
		types?: string[];
		opening_hours?: { weekday_text?: string[] };
		url?: string;
	};
}

const PLACES_TEXTSEARCH_URL =
	"https://maps.googleapis.com/maps/api/place/textsearch/json";

const PLACES_DETAILS_URL =
	"https://maps.googleapis.com/maps/api/place/details/json";

/**
 * Busca empresa por nome + cidade via Google Places Text Search.
 * Pega o primeiro resultado relevante e puxa os detalhes.
 *
 * Chave efetiva: banco (Configurações → Integrações) > env (fallback).
 * Throws se a chave não estiver configurada (placeholder) ou se a API
 * retornar erro. Erros de Places NÃO devem derrubar a pesquisa inteira —
 * o caller faz fallback pro próximo tier.
 */
export async function buscarEmpresaPlaces(
	nome: string,
	cidade: string | null,
	uf: string | null,
): Promise<PlaceResult | null> {
	// Chave efetiva: banco (Configurações → Integrações) > env.
	const { getIntegracaoCredenciais, resolverChave } = await import(
		"./integracao.server"
	);
	const creds = await getIntegracaoCredenciais();
	const apiKey = resolverChave(
		creds.googleMapsApiKey,
		process.env.GOOGLE_MAPS_API_KEY,
	);
	if (!apiKey || apiKey === "AIza-COLE-SUA-CHAVE-AQUI") {
		throw new Error(
			"Chave do Google Places não configurada. Cadastre em Configurações → Integrações.",
		);
	}

	const queryParts = [nome];
	if (cidade) queryParts.push(cidade);
	if (uf) queryParts.push(uf);
	const query = queryParts.join(" ");

	// 1) Text Search
	const searchUrl = new URL(PLACES_TEXTSEARCH_URL);
	searchUrl.searchParams.set("query", query);
	searchUrl.searchParams.set("key", apiKey);
	searchUrl.searchParams.set("language", "pt-BR");
	searchUrl.searchParams.set("region", "br");

	const searchRes = await fetch(searchUrl.toString());
	const searchData = (await searchRes.json()) as PlacesTextSearchResponse;

	if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
		throw new Error(
			`Places Text Search: ${searchData.status} — ${searchData.error_message ?? "erro desconhecido"}`,
		);
	}

	const first = searchData.results?.[0];
	if (!first) {
		return null; // sem resultado, mas sem erro
	}

	// 2) Place Details pra pegar telefone, website, rating, horário
	const detailsUrl = new URL(PLACES_DETAILS_URL);
	detailsUrl.searchParams.set("place_id", first.place_id);
	detailsUrl.searchParams.set("key", apiKey);
	detailsUrl.searchParams.set("language", "pt-BR");
	detailsUrl.searchParams.set(
		"fields",
		"name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,types,opening_hours,url",
	);

	const detailsRes = await fetch(detailsUrl.toString());
	const detailsData = (await detailsRes.json()) as PlacesDetailsResponse;

	if (detailsData.status !== "OK" || !detailsData.result) {
		// Se o details falha, ainda retornamos o básico do text search
		return {
			nome: first.name,
			endereco: first.formatted_address ?? null,
			telefone: null,
			website: null,
			rating: null,
			totalAvaliacoes: null,
			categorias: first.types ?? [],
			horario: null,
			placeId: first.place_id,
			mapaUrl: null,
		};
	}

	const d = detailsData.result;
	return {
		nome: d.name ?? first.name,
		endereco: d.formatted_address ?? first.formatted_address ?? null,
		telefone: d.formatted_phone_number ?? d.international_phone_number ?? null,
		website: d.website ?? null,
		rating: d.rating ?? null,
		totalAvaliacoes: d.user_ratings_total ?? null,
		categorias: d.types ?? first.types ?? [],
		horario: d.opening_hours?.weekday_text?.join("; ") ?? null,
		placeId: first.place_id,
		mapaUrl: d.url ?? null,
	};
}

/**
 * Converte um PlaceResult num resumo em PT-BR (mesmo formato do Gemini
 * grounding) pra a UI exibir e o Operador poder aplicar como Observação.
 */
export function formatarPlaceParaResumo(p: PlaceResult): string {
	const partes: string[] = [];

	partes.push(
		`${p.nome} está listada no Google com endereço ${p.endereco ?? "não informado"}.`,
	);

	if (p.telefone) partes.push(`Telefone oficial: ${p.telefone}.`);
	if (p.website) partes.push(`Site: ${p.website}.`);

	if (p.rating != null && p.totalAvaliacoes != null) {
		partes.push(
			`Reputação no Google: nota ${p.rating.toFixed(1)} de 5 com ${p.totalAvaliacoes} avaliações.`,
		);
	}

	if (p.categorias.length > 0) {
		// Tipos do Places vêm em inglês: "point_of_interest", "establishment"...
		// Pega o primeiro que faça sentido pra pessoa ler
		const cats = p.categorias
			.filter((c) => !["point_of_interest", "establishment"].includes(c))
			.slice(0, 3)
			.join(", ");
		if (cats) partes.push(`Categorias: ${cats}.`);
	}

	if (p.horario) {
		partes.push(`Horário de funcionamento: ${p.horario}.`);
	}

	partes.push(
		"Fonte: Google Places API (camada de fallback, sem pesquisa livre na web).",
	);

	return partes.join("\n\n");
}
