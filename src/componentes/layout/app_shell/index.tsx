import type { ReactNode } from "react";
import { useState } from "react";
import Sidebar from "../sidebar";
import Topbar from "../topbar";

interface AppShellProps {
	children: ReactNode;
	title?: string;
	badge?: string;
	actions?: ReactNode;
	noTopbar?: boolean;
	noPadding?: boolean;
	fullWidth?: boolean;
}

export default function AppShell({
	children,
	title,
	badge,
	actions,
	noTopbar = false,
	noPadding = false,
	fullWidth = false,
}: AppShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
			{/* Mobile backdrop */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black/70 backdrop-blur-xs md:hidden"
					onClick={() => setSidebarOpen(false)}
					onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
					tabIndex={0}
					role="button"
					aria-label="Fechar navegação móvel"
				/>
			)}

			{/* Sidebar fixa no desktop */}
			<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

			{/* Conteúdo à direita */}
			<div className="flex-1 md:pl-64 flex flex-col min-w-0 bg-slate-950">
				{/* Topbar opcional — desativada em telas completas / redesenhadas como o Kanban */}
				{!noTopbar && (
					<Topbar
						title={title}
						badge={badge}
						onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
					/>
				)}

				{/* Botão flutuante para abrir sidebar em mobile quando não houver topbar */}
				{noTopbar && (
					<div className="md:hidden flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800">
						<button
							type="button"
							onClick={() => setSidebarOpen(true)}
							className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2"
						>
							<span>☰</span> Menu
						</button>
						<span className="text-xs font-bold text-white">King Ops</span>
					</div>
				)}

				{!noTopbar && actions && (
					<div className="bg-slate-900/50 border-b border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between">
						<div className="flex items-center gap-3 w-full justify-end">
							{actions}
						</div>
					</div>
				)}

				<main
					className={`flex-1 w-full min-w-0 ${
						noPadding || fullWidth
							? "p-0"
							: "p-4 md:p-8 max-w-screen-2xl mx-auto"
					}`}
				>
					{children}
				</main>
			</div>
		</div>
	);
}
