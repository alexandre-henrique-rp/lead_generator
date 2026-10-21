import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import StatusBadge, { type StatusType } from "#/componentes/composicao/status_badge";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import { formatCurrencyBRL, formatDateBR } from "#/lib/format";
import { listProjetosServerFn, type ProjetoListItem } from "#/api/projetos";
import { projetoKeys } from "#/lib/query-keys";
import { getCurrentUserServerFn } from "#/api/auth";

const estadoParaUi: Record<string, StatusType> = {
  LEVANTAMENTO: "NOVO",
  DOCUMENTACAO: "NOVO",
  ORCAMENTO: "NOVO",
  CONTRATO: "QUALIFICADO",
  EM_DESENVOLVIMENTO: "EM_ANDAMENTO",
  ENTREGUE: "EM_ANDAMENTO",
  FINALIZADO: "CONCLUIDO",
  CANCELADO: "FECHADO_PERDIDO",
};

export const Route = createFileRoute("/projetos/")({
  beforeLoad: async () => {
    const { user } = await getCurrentUserServerFn();
    if (!user) throw redirect({ to: "/login" });
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: projetoKeys.list(),
      queryFn: () => listProjetosServerFn({ data: undefined }),
    });
    return null;
  },
  component: ProjetosPage,
});

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
  const filteredProjetos = allProjetos.filter((proj) => {
    const matchesSearch =
      proj.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proj.leadNome ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstagio = filterEstagio === "ALL" || proj.estado === filterEstagio;
    return matchesSearch && matchesEstagio;
  });

  return (
    <AppShell
      title="Projetos em Andamento"
      badge={`${filteredProjetos.length} projeto${filteredProjetos.length === 1 ? "" : "s"}`}
      actions={
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              viewMode === "cards" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ⊞ Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tabela")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              viewMode === "tabela" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ≡ Tabela
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <Card padding="sm">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">🔍</span>
              <input
                type="text"
                placeholder="Buscar projeto ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-700 rounded-lg bg-slate-950 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <select
              value={filterEstagio}
              onChange={(e) => setFilterEstagio(e.target.value)}
              className="text-xs border border-slate-700 rounded-lg px-3 py-2 bg-slate-950 text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">Todos os Estágios</option>
              <option value="LEVANTAMENTO">Levantamento</option>
              <option value="DOCUMENTACAO">Documentação</option>
              <option value="ORCAMENTO">Orçamento</option>
              <option value="CONTRATO">Contrato</option>
              <option value="EM_DESENVOLVIMENTO">Em desenvolvimento</option>
              <option value="ENTREGUE">Entregue</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
        </Card>

        {isPending ? (
          <div className="text-slate-400 text-sm">Carregando projetos do banco…</div>
        ) : filteredProjetos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-10 text-center">
            <p className="text-slate-400 text-sm">
              {allProjetos.length === 0
                ? "Nenhum projeto cadastrado ainda."
                : "Nenhum projeto encontrado com esses filtros."}
            </p>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjetos.map((proj) => {
              const isBlocked = proj.interrompidoPorFaltaDePagamento;
              const isPaused = proj.pausado;
              const borderCardColor = isBlocked
                ? "border-rose-800/80 bg-rose-950/20 text-slate-200"
                : isPaused
                  ? "border-amber-800/80 bg-amber-950/20 text-slate-200"
                  : "border-slate-800 bg-slate-900/90 text-slate-200";
              const statusUi = estadoParaUi[proj.estado] ?? "NOVO";

              return (
                <div
                  key={proj.uuid}
                  className={`rounded-2xl border p-5 shadow-xs transition-all hover:border-slate-700 flex flex-col justify-between ${borderCardColor}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                          {proj.leadNome ?? "Sem lead"}
                        </span>
                        <Link
                          to={`/projetos/${proj.uuid}`}
                          className="font-bold text-base text-slate-100 hover:text-indigo-400 transition-colors block line-clamp-2"
                        >
                          {proj.nome}
                        </Link>
                      </div>
                      <StatusBadge status={statusUi} />
                    </div>

                    {isBlocked ? (
                      <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2">
                        <span>⛔</span>
                        <span>INTERROMPIDO: falta de pagamento</span>
                      </div>
                    ) : isPaused ? (
                      <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-semibold flex items-center gap-2">
                        <span>⏸</span>
                        <span>Projeto pausado</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
                        <span>📅 {proj.dataEntregaPrevista ? `Entrega: ${formatDateBR(proj.dataEntregaPrevista)}` : "Sem data"}</span>
                        <span className="font-semibold text-slate-200">
                          {formatCurrencyBRL(proj.valorTotalCentavos)}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Progresso</span>
                        <span className="font-bold text-slate-200">{proj.progresso}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isBlocked ? "bg-rose-500" : isPaused ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${proj.progresso}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-800">
                    <Link to={`/projetos/${proj.uuid}`} className="w-full block">
                      <Button variant="outline" size="sm" className="w-full">
                        Abrir Projeto e Kanban →
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase">
                    <th className="py-3 px-4">Projeto</th>
                    <th className="py-3 px-4">Cliente / Lead</th>
                    <th className="py-3 px-4">Estágio</th>
                    <th className="py-3 px-4">Pagamento</th>
                    <th className="py-3 px-4">Progresso</th>
                    <th className="py-3 px-4">Entrega</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProjetos.map((proj) => {
                    const statusUi = estadoParaUi[proj.estado] ?? "NOVO";
                    return (
                      <tr key={proj.uuid} className="hover:bg-slate-800/40 text-slate-200 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-100">
                          <Link to={`/projetos/${proj.uuid}`} className="hover:text-indigo-400 transition-colors">
                            {proj.nome}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{proj.leadNome ?? "—"}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={statusUi} />
                        </td>
                        <td className="py-3 px-4">
                          {proj.interrompidoPorFaltaDePagamento ? (
                            <span className="text-rose-400 font-bold font-mono">ATRASADO</span>
                          ) : (
                            <span className="text-emerald-400 font-bold font-mono">EM DIA</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{proj.progresso}%</td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {proj.dataEntregaPrevista ? formatDateBR(proj.dataEntregaPrevista) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link to={`/projetos/${proj.uuid}`}>
                            <Button variant="outline" size="sm">
                              Abrir →
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
