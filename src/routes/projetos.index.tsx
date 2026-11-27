import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import { formatCurrencyBRL, formatDateBR } from "#/lib/format";
import { listProjetosServerFn, type ProjetoListItem } from "#/api/projetos";
import { projetoKeys } from "#/lib/query-keys";
import { requireUserOrRedirect } from "#/lib/auth-helper";
import { Folder, Search } from "lucide-react";

export const Route = createFileRoute("/projetos/")({
  beforeLoad: ({ location }) =>
    requireUserOrRedirect("/login", location.pathname),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: projetoKeys.list(),
      queryFn: () => listProjetosServerFn({ data: undefined }),
    });
    return null;
  },
  component: ProjetosPage,
});

function getEtapaTone(proj: ProjetoListItem): {
  tone: "indigo" | "sky" | "emerald" | "amber" | "rose";
  accColor: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  etapaLabel: string;
  alert: string | null;
} {
  if (proj.interrompidoPorFaltaDePagamento) {
    return {
      tone: "rose",
      accColor: "bg-rose-500",
      pillBg: "bg-rose-950/60",
      pillBorder: "border-rose-800",
      pillText: "text-rose-300",
      etapaLabel: "INTERROMPIDO",
      alert: "⛔ INTERROMPIDO: falta de pagamento",
    };
  }
  if (proj.pausado) {
    return {
      tone: "amber",
      accColor: "bg-amber-500",
      pillBg: "bg-amber-950/60",
      pillBorder: "border-amber-800",
      pillText: "text-amber-300",
      etapaLabel: "PAUSADO",
      alert: "⏸ Projeto pausado a pedido do cliente",
    };
  }

  switch (proj.estado) {
    case "LEVANTAMENTO":
    case "DOCUMENTACAO":
    case "ORCAMENTO":
      return {
        tone: "sky",
        accColor: "bg-sky-500",
        pillBg: "bg-sky-950/50",
        pillBorder: "border-sky-800",
        pillText: "text-sky-300",
        etapaLabel: "LEVANTAMENTO",
        alert: null,
      };
    case "HOMOLOGACAO":
    case "ENTREGUE":
    case "FINALIZADO":
      return {
        tone: "emerald",
        accColor: "bg-emerald-500",
        pillBg: "bg-emerald-950/50",
        pillBorder: "border-emerald-800",
        pillText: "text-emerald-300",
        etapaLabel: proj.estado === "ENTREGUE" ? "ENTREGUE" : "HOMOLOGAÇÃO",
        alert: null,
      };
    case "CANCELADO":
      return {
        tone: "rose",
        accColor: "bg-rose-500",
        pillBg: "bg-rose-950/60",
        pillBorder: "border-rose-800",
        pillText: "text-rose-300",
        etapaLabel: "CANCELADO",
        alert: null,
      };
    default:
      return {
        tone: "indigo",
        accColor: "bg-indigo-500",
        pillBg: "bg-indigo-950/50",
        pillBorder: "border-indigo-800",
        pillText: "text-indigo-300",
        etapaLabel: "DESENVOLVIMENTO",
        alert: null,
      };
  }
}

function ProjetosPage() {
  const [viewMode, setViewMode] = useState<"cards" | "tabela">("cards");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstagio, setFilterEstagio] = useState<string>("ALL");

  const { data, isPending, isError } = useQuery({
    queryKey: projetoKeys.list(),
    queryFn: () => listProjetosServerFn({ data: undefined }),
    staleTime: 30_000,
  });

  if (isError) {
    return (
      <AppShell title="Projetos">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300 text-sm">
          Erro ao carregar projetos. Tente recarregar a página.
        </div>
      </AppShell>
    );
  }

  const allProjetos: ProjetoListItem[] = data?.projetos ?? [];
  const ativosCount = allProjetos.filter((p) => !p.interrompidoPorFaltaDePagamento && !p.pausado && p.estado !== "CANCELADO").length;
  const interrompidosCount = allProjetos.filter((p) => p.interrompidoPorFaltaDePagamento).length;

  const filteredProjetos = allProjetos.filter((proj) => {
    const matchesSearch =
      proj.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proj.leadNome ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstagio =
      filterEstagio === "ALL" ||
      (filterEstagio === "INTERROMPIDO" && proj.interrompidoPorFaltaDePagamento) ||
      (filterEstagio === "PAUSADO" && proj.pausado) ||
      proj.estado === filterEstagio;
    return matchesSearch && matchesEstagio;
  });

  return (
    <AppShell
      title="Carteira de Projetos & Execução"
      description="Acompanhamento de entregas, progresso de sprints e alertas automáticos de inadimplência ou pausa"
      breadcrumb="4. Execução & Entrega / Projetos (/projetos)"
      badge={`${ativosCount} PROJETOS ATIVOS · ${interrompidosCount} INTERROMPIDO${interrompidosCount === 1 ? "" : "S"}`}
      badgeColor="indigo"
    >
      <div className="space-y-6">
        {/* Toolbar: Search + Stage Filter + View Switcher (Cards | Tabela) */}
        <div className="rounded-xl border border-slate-800 bg-[#111625] p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex flex-1 items-center gap-3 w-full">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Buscar por nome do projeto ou cliente…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-800 bg-[#0b0f19] rounded-lg text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="relative min-w-[220px]">
              <select
                value={filterEstagio}
                onChange={(e) => setFilterEstagio(e.target.value)}
                aria-label="Filtrar por etapa"
                className="w-full text-xs border border-slate-800 rounded-lg px-3 py-2 bg-[#0b0f19] text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Etapa: Todas as etapas ({allProjetos.length})</option>
                <option value="LEVANTAMENTO">Etapa: Levantamento</option>
                <option value="EM_DESENVOLVIMENTO">Etapa: Desenvolvimento</option>
                <option value="HOMOLOGACAO">Etapa: Homologação</option>
                <option value="ENTREGUE">Etapa: Entregue</option>
                <option value="PAUSADO">Etapa: Pausado</option>
                <option value="INTERROMPIDO">Etapa: Interrompido (Financeiro)</option>
                <option value="CANCELADO">Etapa: Cancelado</option>
              </select>
            </div>
          </div>

          {/* Switcher Cards vs Tabela */}
          <div className="inline-flex rounded-lg border border-slate-800 bg-[#0b0f19] p-1 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === "cards" ? "bg-[#4f46e5] text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>⊞</span>
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tabela")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === "tabela" ? "bg-[#4f46e5] text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>≡</span>
              <span>Tabela</span>
            </button>
          </div>
        </div>

        {/* Conteúdo Dinâmico */}
        {isPending ? (
          <div className="text-slate-400 text-sm">Carregando projetos do banco…</div>
        ) : filteredProjetos.length === 0 ? (
          /* Fallback: Carteira Vazia / Filtro Sem Projetos */
          <div className="rounded-2xl border border-slate-800 bg-[#111625] p-12 text-center max-w-lg mx-auto shadow-md">
            <div className="w-14 h-14 rounded-full bg-indigo-950/70 border border-indigo-700/60 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Folder className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">
              Nenhum projeto nesta etapa
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Converta um lead qualificado na Ficha 360º ou limpe o filtro de etapas.
            </p>
            <Link to="/leads/funil">
              <Button variant="primary" size="md">
                Ir para Kanban do Funil →
              </Button>
            </Link>
          </div>
        ) : viewMode === "cards" ? (
          /* 6 Project Cards Grid (3 columns) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjetos.map((proj) => {
              const meta = getEtapaTone(proj);
              const cardBg = meta.tone === "rose" ? "bg-[#1c0913]" : meta.tone === "amber" ? "bg-[#1c1309]" : "bg-[#111625]";
              const cardBrd = meta.tone === "rose" ? "border-rose-900/60" : meta.tone === "amber" ? "border-amber-900/60" : "border-slate-800/80";

              return (
                <div
                  key={proj.uuid}
                  className={`relative rounded-xl border p-5 shadow-xs transition-all hover:border-slate-700 flex flex-col justify-between overflow-hidden ${cardBg} ${cardBrd}`}
                >
                  {/* Borda lateral colorida de 4px */}
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${meta.accColor}`} />

                  <div className="space-y-3 pl-1">
                    {/* Alerta ou Pill da Etapa */}
                    {meta.alert ? (
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${meta.pillBg} ${meta.pillBorder} ${meta.pillText}`}>
                        {meta.alert}
                      </span>
                    ) : (
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${meta.pillBg} ${meta.pillBorder} ${meta.pillText}`}>
                        {meta.etapaLabel}
                      </span>
                    )}

                    <div>
                      <Link
                        to={`/projetos/${proj.uuid}`}
                        className="font-bold text-sm text-slate-100 hover:text-indigo-400 transition-colors block line-clamp-2 leading-snug"
                      >
                        {proj.nome}
                      </Link>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Cliente: <strong className="text-slate-300 font-medium">{proj.leadNome ?? "Sem lead vinculado"}</strong>
                      </p>
                    </div>

                    {/* Barra de Progresso Penpot */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Progresso</span>
                        <span className="font-bold text-slate-200">{proj.progresso}%</span>
                      </div>
                      <div className="w-full bg-[#1e2538] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${meta.accColor}`}
                          style={{ width: `${Math.max(5, proj.progresso)}%` }}
                        />
                      </div>
                    </div>

                    {/* Divisor */}
                    <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-xs font-mono">
                      <span className={`text-[10px] ${meta.tone === "rose" ? "text-rose-400 font-semibold" : "text-slate-400"}`}>
                        {meta.tone === "rose"
                          ? "Atrasado (Inadimplência)"
                          : proj.dataEntregaPrevista
                            ? `Entrega: ${formatDateBR(proj.dataEntregaPrevista)}`
                            : "Entrega a definir"}
                      </span>
                      <span className="text-xs font-bold text-indigo-300">
                        {formatCurrencyBRL(proj.valorTotalCentavos)}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé: Botão Workspace */}
                  <div className="pt-3 mt-2 border-t border-slate-800/60 pl-1">
                    <Link to={`/projetos/${proj.uuid}`} className="w-full block">
                      <Button variant="outline" size="sm" className="w-full justify-center text-xs">
                        Workspace →
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Modo Tabela (≡ Tabela) */
          <div className="rounded-xl border border-slate-800 bg-[#111625] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Variante de Visualização: Modo Tabela (≡ Tabela)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Alternância instantânea para conferência rápida de prazos, progresso e valores
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#14192b] border border-slate-700 text-slate-300">
                MODO: TABELA
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0b0f19] text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">PROJETO & CLIENTE</th>
                    <th className="py-3 px-4">ETAPA</th>
                    <th className="py-3 px-4">PROGRESSO</th>
                    <th className="py-3 px-4">VALOR TOTAL</th>
                    <th className="py-3 px-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProjetos.map((proj) => {
                    const meta = getEtapaTone(proj);
                    return (
                      <tr key={proj.uuid} className="hover:bg-slate-800/40 text-slate-200 transition-colors">
                        <td className="py-3.5 px-4">
                          <Link to={`/projetos/${proj.uuid}`} className="font-bold text-slate-100 hover:text-indigo-400 transition-colors block">
                            {proj.nome}
                          </Link>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {proj.leadNome ?? "Sem lead vinculado"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${meta.pillBg} ${meta.pillBorder} ${meta.pillText}`}>
                            {meta.etapaLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                          {proj.progresso}%
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                          {formatCurrencyBRL(proj.valorTotalCentavos)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link to={`/projetos/${proj.uuid}`}>
                            <Button variant="outline" size="sm">
                              Workspace →
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

