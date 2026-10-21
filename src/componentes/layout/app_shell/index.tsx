import type { ReactNode } from "react";
import { useState } from "react";
import Sidebar from "../sidebar";
import Topbar from "../topbar";

interface AppShellProps {
	children: ReactNode;
	title?: string;
	badge?: string;
	actions?: ReactNode;
}

export default function AppShell({
	children,
	title,
	badge,
	actions,
}: AppShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="min-h-screen bg-black text-slate-200 flex flex-col font-sans">
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
			<div className="flex-1 md:pl-64 flex flex-col min-w-0">
				<Topbar
					title={title}
					badge={badge}
					onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
				/>

				{actions && (
					<div className="bg-slate-900/50 border-b border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between">
						<div className="flex items-center gap-3 w-full justify-end">
							{actions}
						</div>
					</div>
				)}

				<main className="flex-1 p-4 md:p-8 max-w-screen-2xl w-full mx-auto">
					{children}
				</main>
			</div>
		</div>
	);
}
