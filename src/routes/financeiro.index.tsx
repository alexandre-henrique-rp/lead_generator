import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import { formatCurrencyBRL, formatDateBR } from "#/lib/format";
import {
  listParcelasServerFn,
  marcarParcelaPagaServerFn,
  type ParcelaItem,
} from "#/api/financeiro";
import { requireUserOrRedirect } from "#/lib/auth-helper";
import { parcelaKeys } from "#/lib/query-keys";

export const Route = createFileRoute("/financeiro/")({
  beforeLoad: ({ location }) =>
    requireUserOrRedirect("/login", location.pathname),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: parcelaKeys.list(),
      queryFn: () => listParcelasServerFn({ data: undefined }),
    });
    return null;
  },
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const { data, isPending, isError } = useQuery({
    queryKey: parcelaKeys.list(),
    queryFn: () => listParcelasServerFn({ data: undefined }),
    staleTime: 30_000,
  });

  const marcarPagaMutation = useMutation({
    mutationFn: (parcelaUuid: string) =>
      marcarParcelaPagaServerFn({ data: { parcelaUuid } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: parcelaKeys.all });
      setSelectedUuid(null);
      setFeedbackMsg("Parcela marcada como paga.");
      setTimeout(() => setFeedbackMsg(""), 3000);
    },
  });

  if (isError) {
    return (
      <AppShell title="Financeiro">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300 text-sm">
          Erro ao carregar parcelas.
        </div>
      </AppShell>
    );
  }

  const allParcelas: ParcelaItem[] = data?.parcelas ?? [];
  const filtered = allParcelas.filter((p) =>
    statusFilter === "ALL" ? true : p.status === statusFilter,
  );

  const totais = {
    pendente: allParcelas.filter((p) => p.status === "PENDENTE").reduce((acc, p) => acc + p.valorCentavos, 0),
    atrasada: allParcelas.filter((p) => p.status === "ATRASADA").reduce((acc, p) => acc + p.valorCentavos, 0),
    paga: allParcelas.filter((p) => p.status === "PAGA").reduce((acc, p) => acc + p.valorCentavos, 0),
  };

  return (
    <AppShell
      title="Visão Geral Financeira"
      badge={`${allParcelas.length} parcela${allParcelas.length === 1 ? "" : "s"}`}
      actions={
        <Link to="/financeiro/precos">
          <Button variant="outline" size="sm">
            ⚙ Configurar Preços (F3)
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {feedbackMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold">
            ✓ {feedbackMsg}
          </div>
        )}

        {/* Cards de totais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-[10px] text-slate-500 uppercase">A receber (pendente)</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {formatCurrencyBRL(totais.pendente)}
            </p>
          </Card>
          <Card>
            <p className="text-[10px] text-slate-500 uppercase">Em atraso</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              {formatCurrencyBRL(totais.atrasada)}
            </p>
          </Card>
          <Card>
            <p className="text-[10px] text-slate-500 uppercase">Recebido (pago)</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrencyBRL(totais.paga)}
            </p>
          </Card>
        </div>

        {/* Filtro */}
        <Card padding="sm">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-700 rounded-lg px-3 py-2 bg-slate-950 text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="ATRASADA">Atrasada</option>
            <option value="PAGA">Paga</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </Card>

        {isPending ? (
          <div className="text-slate-400 text-sm">Carregando parcelas do banco…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-10 text-center">
            <p className="text-slate-400 text-sm">
              {allParcelas.length === 0
                ? "Nenhuma parcela cadastrada ainda."
                : "Nenhuma parcela com esse filtro."}
            </p>
          </div>
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase">
                    <th className="py-3 px-4">Cliente / Projeto</th>
                    <th className="py-3 px-4">Nº</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((p) => {
                    const statusClass =
                      p.status === "PAGA"
                        ? "text-emerald-400"
                        : p.status === "ATRASADA"
                          ? "text-rose-400"
                          : p.status === "CANCELADA"
                            ? "text-slate-500"
                            : "text-amber-400";
                    return (
                      <tr key={p.uuid} className="hover:bg-slate-800/40 text-slate-200">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-100">{p.clienteNome ?? "—"}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {p.projetoNome}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{p.numero}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {formatDateBR(p.dataVencimento)}
                          {p.pagaComAtraso && (
                            <span className="ml-2 text-[10px] text-amber-400 font-bold">paga c/ atraso</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {formatCurrencyBRL(p.valorCentavos)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-bold font-mono ${statusClass}`}>{p.status}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {p.status !== "PAGA" && p.status !== "CANCELADA" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setSelectedUuid(p.uuid)}
                              isLoading={marcarPagaMutation.isPending && selectedUuid === p.uuid}
                            >
                              Marcar paga
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Modal de confirmação */}
        {selectedUuid && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-100 mb-2">Confirmar pagamento</h3>
              <p className="text-sm text-slate-300 mb-6">
                Marcar esta parcela como paga? Um registro de Pagamento será criado com a data de hoje.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedUuid(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => selectedUuid && marcarPagaMutation.mutate(selectedUuid)}
                  isLoading={marcarPagaMutation.isPending}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
