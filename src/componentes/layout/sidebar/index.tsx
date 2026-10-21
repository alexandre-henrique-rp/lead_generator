import { Link, useRouterState } from "@tanstack/react-router";

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Leads", to: "/leads", icon: "🎯" },
  { label: "Garimpo", to: "/leads/garimpo", icon: "⛏️" },
  { label: "Projetos", to: "/projetos", icon: "📁" },
  { label: "Financeiro", to: "/financeiro", icon: "💰" },
  { label: "Configurações", to: "/configuracoes", icon: "⚙️" },
];

export default function Sidebar({ isOpen = true, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
        <Link to="/leads" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            K
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-100 tracking-tight">King Ops</span>
            <span className="text-[10px] text-slate-400 font-mono">Central Administrativa</span>
          </div>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-slate-100 p-1 rounded-md"
            aria-label="Fechar menu"
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPath === item.to || currentPath.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Operador Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/90">
        <Link
          to="/perfil"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900/80 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-bold text-xs text-indigo-300 font-mono">
            AH
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Alexandre Henrique</p>
            <p className="text-[10px] text-slate-400 truncate font-mono">Operador Sênior</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
