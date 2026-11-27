import { createFileRoute } from "@tanstack/react-router";

// Healthcheck do container (docker-compose.yml) — sem acesso a banco.
export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: () =>
				new Response(JSON.stringify({ status: "ok" }), {
					headers: { "content-type": "application/json" },
				}),
		},
	},
});
