import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

interface NavItem {
  label: string;
  to: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

const navItems: NavItem[] = [
  {
    label: "Garimpo Multicanal",
    to: "/leads/garimpo",
    icon: "⛏️",
    badge: "3 motores",
    badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
  },
  {
    label: "Base de Leads",
    to: "/leads",
    icon: "👥",
    badge: "1.284",
    badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
  },
  {
    label: "Funil Kanban (D&D)",
    to: "/leads/funil",
    icon: "⊞",
    badge: "42 ativos",
    badgeColor: "bg-indigo-900/80 text-indigo-300 border-indigo-700",
  },
  {
    label: "Projetos & Sprints",
    to: "/projetos",
    icon: "📁",
    badge: "14",
    badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
  },
  {
    label: "Financeiro & Preços",
    to: "/financeiro",
    icon: "💰",
    badge: "G-03",
    badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
  },
  {
    label: "Configurações & PKI",
    to: "/configuracoes",
    icon: "⚙️",
    badge: "X.509",
    badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
  },
];

export default function Sidebar({
  isOpen = true,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const [quickSearch, setQuickSearch] = useState("");

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-900 flex flex-col transition-transform md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header idêntico ao Penpot */}
      <div className="p-4 border-b border-slate-900 flex items-center justify-between">
        <Link to="/leads/funil" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
            K
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm text-white tracking-wider">
              KING OPS
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight">
              v2.4 · COMERCIAL &amp; EXECUÇÃO
            </span>
          </div>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Fechar menu"
          >
            ✕
          </button>
        )}
      </div>

      {/* Caixa de Busca Rápida na Sidebar */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar lead, CNPJ..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
            ⌘K
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.to === "/leads"
              ? currentPath === "/leads"
              : item.to === "/leads/funil"
                ? currentPath === "/leads/funil"
                : currentPath === item.to || currentPath.startsWith(`${item.to}/`);

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isActive
                      ? "bg-indigo-950/80 text-white border-indigo-400/40"
                      : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Card: Integrações Ativas idêntico ao Penpot */}
      <div className="px-3 pb-2">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-900 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Integrações Ativas</span>
          </div>
          <p className="text-[10px] font-mono text-slate-400 leading-tight">
            Gemini 3.5 · BrasilAPI · Maps
          </p>
          <p className="text-[9px] font-mono text-slate-400 leading-tight">
            PKI X.509 · Regra G-03 Ligada
          </p>
        </div>
      </div>

      {/* Operador Footer idêntico ao Penpot */}
      <div className="p-3 border-t border-slate-900 bg-slate-950">
        <Link
          to="/perfil"
          className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-900/80 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-500/40 flex items-center justify-center font-black text-[11px] text-indigo-300 font-mono">
            KD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">King Dev</p>
            <p className="text-[10px] text-slate-400 truncate font-mono">
              ADMIN · /perfil
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
