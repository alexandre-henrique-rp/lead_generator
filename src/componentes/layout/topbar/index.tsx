interface TopbarProps {
  onToggleSidebar?: () => void;
  title?: string;
  badge?: string;
}

export default function Topbar({ onToggleSidebar, title, badge }: TopbarProps) {
  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-700"
          aria-label="Abrir menu"
        >
          ☰
        </button>
        {title && (
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold text-slate-100">{title}</h1>
            {badge && (
              <span className="text-xs bg-slate-800 text-indigo-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                {badge}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2.5 py-1 rounded-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sistema Operacional</span>
        </div>
      </div>
    </header>
  );
}
