import { createMiddleware, createStart } from "@tanstack/react-start";

/**
 * Documento HTML nunca deve ficar em cache (browser/edge).
 *
 * O HTML referencia assets com hash (ex.: /assets/index-XXXX.js). Se um HTML
 * antigo ficar em cache, o browser passa a pedir assets que não existem mais
 * no servidor → 404 → página "quebrada" (CSS ausente) até um refresh manual.
 *
 * Assets com hash (/assets/*) continuam com cache longo — eles nunca mudam
 * de conteúdo enquanto o hash existir.
 */
const htmlNoCacheMiddleware = createMiddleware({
	type: "request",
}).server(async ({ next }) => {
	const result = await next();
	const { response } = result;
	const contentType = response.headers.get("content-type") ?? "";

	if (!contentType.includes("text/html")) {
		return result;
	}

	const headers = new Headers(response.headers);
	headers.set("cache-control", "no-cache, no-store, must-revalidate");

	return {
		...result,
		response: new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		}),
	};
});

export const startInstance = createStart(() => ({
	requestMiddleware: [htmlNoCacheMiddleware],
}));
