import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
	useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanstackQueryProvider from "../integrations/tanstack-query/root-provider";
// Import normal (sem ?url): o CSS passa a ser um chunk real do build do
// cliente, e o <link> no HTML sai do manifest do client build.
// Com "?url" o ambiente SSR resolvia um hash DIFERENTE do arquivo emitido
// (styles-<hash>.css != styles-<hash>.css do client) → 404 no CSS →
// página sem estilo até o JS injetar o CSS ("quebra e depois atualiza").
import "../styles.css";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title:
					"King Dev Tec — Engenharia de Software Solo para Startups & Negócios Locais",
			},
			{
				name: "description",
				content:
					"MVP, SaaS, bots de IA e automações para startups e negócios locais. Vá da ideia ao sistema escalável falando direto com o desenvolvedor sênior que constrói.",
			},
			{
				property: "og:title",
				content: "King Dev Tec — Engenharia de Software Solo",
			},
			{
				property: "og:description",
				content:
					"MVP, SaaS, bots de IA e automações para startups e negócios locais sem a burocracia de agências.",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:image",
				content: "/Logo_KingDevTec_01.png",
			},
			{
				name: "theme-color",
				content: "#000000",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/KingDevTec.ico",
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: NotFound,
});

function NotFound() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
			<p className="text-4xl font-bold text-slate-800">404</p>
			<p className="text-sm text-slate-500">Página não encontrada.</p>
			<a
				href="/"
				className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
			>
				Voltar para o início
			</a>
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const { queryClient } = useRouter().options.context;
	return (
		<html lang="pt-BR">
			<head>
				<HeadContent />
			</head>
			<body>
				<TanstackQueryProvider queryClient={queryClient}>
					{children}
				</TanstackQueryProvider>
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
