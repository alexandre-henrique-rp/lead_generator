/**
 * Utilitários e tipos para integração com Google Maps Places API (direto, sem intermediário).
 * Endpoints usados:
 *  - Text Search: https://maps.googleapis.com/maps/api/place/textsearch/json
 *  - Place Details: https://maps.googleapis.com/maps/api/place/details/json
 *
 * Credenciais lidas exclusivamente do process.env.GOOGLE_MAPS_API_KEY (servidor).
 * Custo estimado: ~US$ 0.032 / Text Search + ~US$ 0.017 / Place Details.
 */

import type { LeadGarimpado } from "./aisa";

export interface GooglePlacesTextSearchParams {
	/** Ex: "clinicas ribeirão preto" */
	query: string;
	/** Ex: "Ribeirão Preto, SP, Brasil" — usado em location + region */
	location?: string;
	/** Centro em lat,lng para bias. Ex: "-21.1784,-47.8103" */
	centerLatLng?: string;
	/** Raio em metros (quando usar centerLatLng). Default 10000 (10km). */
	radius?: number;
	/** Max resultados. Default 15, máx 60 (limite do Google). */
	maxResults?: number;
	/** Idioma. Default "pt-BR". */
	language?: string;
	/** Região ISO 3166-1 alpha-2. Default "br". */
	region?: string;
}

export interface GooglePlaceDetailsParams {
	placeId: string;
	/** Quais campos extras buscar. Default ["formatted_phone_number","website","opening_hours"]. */
	fields?: string[];
	language?: string;
}

/** Input do motor de garimpo Google Maps (Text Search + Details). */
export interface GoogleMapsServerInput {
	query: string;
	location?: string;
	centerLatLng?: string;
	radius?: number;
	maxResults?: number;
	language?: string;
	region?: string;
}

export interface GoogleMapsServerResponse {
	success: boolean;
	isMock: boolean;
	leads: LeadGarimpado[];
	total: number;
	costEstimate?: string;
	message?: string;
	error?: string;
}

/**
 * Normaliza a resposta do Google Places Text Search + Details para LeadGarimpado.
 * Espera-se que `place` já tenha os campos de details preenchidos (telefone, website).
 */
export function normalizarGooglePlace(
	place: any,
	index: number,
	fallbackCidade = "Ribeirão Preto",
	fallbackEstado = "SP",
): LeadGarimpado {
	const telefone =
		place.formatted_phone_number ||
		place.international_phone_number ||
		place.phone ||
		undefined;
	const temTelefone = Boolean(
		telefone && telefone.replace(/\D/g, "").length >= 8,
	);

	const enderecoCompleto = place.formatted_address || place.vicinity || "";
	const { cidade, estado } = extrairCidadeEstado(
		enderecoCompleto,
		fallbackCidade,
		fallbackEstado,
	);

	return {
		id: `gmaps-${place.place_id || index + 1}-${Date.now()}`,
		nome: place.name || "Estabelecimento sem nome",
		razaoSocial: place.name,
		dominio: extrairDominio(place.website),
		telefone,
		temTelefone,
		endereco: enderecoCompleto,
		cidade,
		estado,
		setor: extrairCategoria(place.types),
		rating: typeof place.rating === "number" ? place.rating : undefined,
		reviewsCount:
			typeof place.user_ratings_total === "number"
				? place.user_ratings_total
				: undefined,
		motor: "GOOGLE_MAPS_PLACES",
		selected: temTelefone,
	};
}

/**
 * Monta a URL do Places API Text Search.
 * https://developers.google.com/maps/documentation/places/web-service/search-text
 */
export function buildGooglePlacesTextSearchUrl(
	params: GooglePlacesTextSearchParams,
	apiKey: string,
): string {
	const usp = new URLSearchParams();
	usp.set("query", params.query.trim());
	if (params.location) usp.set("location", params.location);
	if (params.centerLatLng && params.radius) {
		usp.set("location", params.centerLatLng);
		usp.set("radius", String(params.radius));
	}
	usp.set("language", params.language ?? "pt-BR");
	usp.set("region", params.region ?? "br");
	usp.set("key", apiKey);
	return `https://maps.googleapis.com/maps/api/place/textsearch/json?${usp.toString()}`;
}

/**
 * Monta a URL do Places API Place Details.
 * https://developers.google.com/maps/documentation/places/web-service/details
 */
export function buildGooglePlaceDetailsUrl(
	params: GooglePlaceDetailsParams,
	apiKey: string,
): string {
	const usp = new URLSearchParams();
	usp.set(
		"fields",
		(
			params.fields ?? [
				"name",
				"formatted_address",
				"formatted_phone_number",
				"international_phone_number",
				"website",
				"rating",
				"user_ratings_total",
				"types",
				"place_id",
			]
		).join(","),
	);
	if (params.language) usp.set("language", params.language);
	usp.set("place_id", params.placeId);
	usp.set("key", apiKey);
	return `https://maps.googleapis.com/maps/api/place/details/json?${usp.toString()}`;
}

/**
 * Recupera a chave do Google Maps do process.env (servidor).
 * Retorna string vazia se ausente. Lança erro se chamada no client.
 */
export function getGoogleMapsApiKey(): string {
	if (typeof process !== "undefined" && process.env?.GOOGLE_MAPS_API_KEY) {
		return String(process.env.GOOGLE_MAPS_API_KEY).trim();
	}
	return "";
}

// ---- helpers internos ------------------------------------------------------

function extrairDominio(website: string | undefined): string | undefined {
	if (!website) return undefined;
	try {
		const url = website.startsWith("http") ? website : `https://${website}`;
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return website;
	}
}

function extrairCategoria(types: string[] | undefined): string | undefined {
	if (!types || types.length === 0) return undefined;
	const legivel: Record<string, string> = {
		restaurant: "Restaurante",
		cafe: "Cafeteria",
		bakery: "Padaria",
		pharmacy: "Farmácia",
		hospital: "Hospital",
		doctor: "Clínica Médica",
		dentist: "Odontologia",
		beauty_salon: "Salão de Beleza",
		gym: "Academia",
		car_repair: "Oficina Mecânica",
		car_dealer: "Concessionária",
		real_estate_agency: "Imobiliária",
		lawyer: "Advocacia",
		accounting: "Contabilidade",
		school: "Escola",
		university: "Universidade",
		store: "Comércio",
		supermarket: "Supermercado",
		clothing_store: "Loja de Roupas",
		hardware_store: "Loja de Ferragens",
		electrician: "Eletricista",
		plumber: "Encanador",
		general_contractor: "Construção",
		insurance_agency: "Seguros",
		bank: "Banco",
		atm: "Caixa Eletrônico",
		lodging: "Hospedagem",
		travel_agency: "Agência de Viagens",
		pet_store: "Pet Shop",
		veterinary_care: "Veterinária",
	};
	for (const t of types) {
		if (legivel[t]) return legivel[t];
	}
	return types[0]?.replace(/_/g, " ");
}

function extrairCidadeEstado(
	endereco: string,
	fallbackCidade: string,
	fallbackEstado: string,
): { cidade: string; estado: string } {
	if (!endereco) return { cidade: fallbackCidade, estado: fallbackEstado };
	const m = endereco.match(
		/-\s*([A-Za-zÀ-ÿ\s]+),\s*([A-Z]{2})(?:,?\s*Brasil)?\s*$/,
	);
	if (m) {
		return { cidade: m[1].trim(), estado: m[2] };
	}
	const parts = endereco.split(",").map((p) => p.trim());
	return {
		cidade: parts[parts.length - 3] ?? fallbackCidade,
		estado:
			parts[parts.length - 2]?.slice(0, 2)?.toUpperCase() ?? fallbackEstado,
	};
}
