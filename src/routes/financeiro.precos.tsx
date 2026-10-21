import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import {
  getPriceConfigServerFn,
  updatePriceConfigServerFn,
  restorePriceConfigDefaultsServerFn,
  type PriceConfig,
} from "#/api/config";
import { getCurrentUserServerFn } from "#/api/auth";
import { configKeys } from "#/lib/query-keys";

export const Route = createFileRoute("/financeiro/precos")({
  beforeLoad: async () => {
    const { user } = await getCurrentUserServerFn();
    if (!user) throw redirect({ to: "/login" });
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: configKeys.priceConfig(),
      queryFn: () => getPriceConfigServerFn(),
    });
    return null;
  },
  component: PriceConfigPage,
});

function reais(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}
function reaisParaCentavos(txt: string): number {
  const n = Number(txt.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function percent(txt: string): number {
  const n = Number(txt.replace(",", "."));
  return Number.isFinite(n) ? n / 100 : 0;
}
function percentDisplay(v: number): string {
  return (v * 100).toFixed(1).replace(".", ",");
}

function PriceConfigPage() {
  const queryClient = useQueryClient();
  const [salvo, setSalvo] = useState(false);

  // form state
  const [custoHora, setCustoHora] = useState("60,19");
  const [precoHora, setPrecoHora] = useState("95,00");
  const [margemMinima, setMargemMinima] = useState("1,50");
  const [regime, setRegime] = useState("SIMPLES_NACIONAL_ANEXO_III");
  const [aliquotaImposto, setAliquotaImposto] = useState("6,0");
  const [proLabore, setProLabore] = useState("2.240,00");
  const [inssPercent, setInssPercent] = useState("11,0");
  const [reservaPercent, setReservaPercent] = useState("10,0");
  const [custoFixoMensal, setCustoFixoMensal] = useState("3.500,00");

  const configQuery = useQuery({
    queryKey: configKeys.priceConfig(),
    queryFn: () => getPriceConfigServerFn(),
  });

  // popular form quando carrega do banco
  useEffect(() => {
    const c = configQuery.data?.config;
    if (!c) return;
    setCustoHora(reais(c.custoHoraCentavos));
    setPrecoHora(reais(c.precoHoraTabelaCentavos));
    setMargemMinima(c.margemMinima.toFixed(2).replace(".", ","));
    setRegime(c.regime);
    setAliquotaImposto(percentDisplay(c.aliquotaImpostos));
    setProLabore(reais(c.prolaboreCentavos));
    setInssPercent(percentDisplay(c.inssAliquota));
    setReservaPercent(percentDisplay(c.reservaMesesVazios));
    setCustoFixoMensal(reais(c.custoFixoMensalCentavos));
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updatePriceConfigServerFn({
        data: {
          custoHoraCentavos: reaisParaCentavos(custoHora),
          precoHoraTabelaCentavos: reaisParaCentavos(precoHora),
          margemMinima: Number(margemMinima.replace(",", ".")),
          regime: regime as
            | "SIMPLES_NACIONAL_ANEXO_I"
            | "SIMPLES_NACIONAL_ANEXO_III"
            | "SIMPLES_NACIONAL_ANEXO_V"
            | "LUCRO_PRESUMIDO"
            | "MEI",
          aliquotaImpostos: percent(aliquotaImposto),
          prolaboreCentavos: reaisParaCentavos(proLabore),
          inssAliquota: percent(inssPercent),
          reservaMesesVazios: percent(reservaPercent),
          custoFixoMensalCentavos: reaisParaCentavos(custoFixoMensal),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: configKeys.priceConfig() });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => restorePriceConfigDefaultsServerFn(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: configKeys.priceConfig() });
    },
  });

  const bloqueioG03 = configQuery.data?.config.bloqueioPiso ?? true;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSalvo(false);
    saveMutation.mutate();
  }

  if (configQuery.isPending) {
    return (
      <AppShell title="Configurações de Preço">
        <div className="text-slate-400 text-sm">Carregando PriceConfig do banco…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Configurações de Preço (PriceConfig)"
      badge="G-03 — Bloqueio de Margem"
      actions={
        <Link to="/financeiro">
          <Button variant="outline" size="sm">
            ← Voltar para Financeiro
          </Button>
        </Link>
      }
    >
      <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6">
        {salvo && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-semibold">
            ✓ PriceConfig atualizado! Propostas em rascunho serão recalculadas.
          </div>
        )}

        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs leading-relaxed">
          <strong>Atenção:</strong> Alterar estas regras recalcula o piso mínimo de lucro.
        </div>

        <Card header={<h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">1. Base Horária & Margem Mínima</h3>}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="custo-hora" className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Custo-Hora (R$)</label>
              <input id="custo-hora" type="text" value={custoHora}
                onChange={(e) => setCustoHora(e.target.value)}
                className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label htmlFor="preco-hora" className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Preço-Hora Tabela (R$)</label>
              <input id="preco-hora" type="text" value={precoHora}
                onChange={(e) => setPrecoHora(e.target.value)}
                className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label htmlFor="margem-minima" className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Multiplicador Mínimo (Markup)</label>
              <input id="margem-minima" type="text" value={margemMinima}
                onChange={(e) => setMargemMinima(e.target.value)}
                className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none" />
              <span className="text-[10px] text-slate-500 mt-1 block">Piso: Custo × Markup (RN-001)</span>
            </div>
          </div>
        </Card>

        <Card header={<h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">2. Regime Tributário & Impostos</h3>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="regime-tributario" className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Regime Fiscal</label>
              <select id="regime-tributario" value={regime}
                onChange={(e) => setRegime(e.target.value)}
                className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none">
                <option value="SIMPLES_NACIONAL_ANEXO_I">Simples Nacional (Anexo I)</option>
                <option value="SIMPLES_NACIONAL_ANEXO_III">Simples Nacional (Anexo III - 6%)</option>
                <option value="SIMPLES_NACIONAL_ANEXO_V">Simples Nacional (Anexo V)</option>
                <option value="LUCRO_PRESUMIDO">Lucro Presumido (16,33%)</option>
                <option value="MEI">MEI (Isento / Fixo)</option>
              </select>
            </div>
            <div>
              <label htmlFor="aliquota-imposto" className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Alíquota Efetiva de Imposto (%)</label>
              <input id="aliquota-imposto" type="text" value={aliquotaImposto}
                onChange={(e) => setAliquotaImposto(e.target.value)}
                className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
          </div>
        </Card>

        <Card header={<h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">3. Custos Fixos & Remuneração</h3>}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="pro-labore" className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Pró-labore (R$)</label>
              <input id="pro-labore" type="text" value={proLabore}
                onChange={(e) => setProLabore(e.target.value)}
                className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label htmlFor="inss-percent" className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">INSS Retido (%)</label>
              <input id="inss-percent" type="text" value={inssPercent}
                onChange={(e) => setInssPercent(e.target.value)}
                className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label htmlFor="custo-fixo" className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Custo Fixo (R$)</label>
              <input id="custo-fixo" type="text" value={custoFixoMensal}
                onChange={(e) => setCustoFixoMensal(e.target.value)}
                className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label htmlFor="reserva-percent" className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Reserva Meses Vazios (%)</label>
              <input id="reserva-percent" type="text" value={reservaPercent}
                onChange={(e) => setReservaPercent(e.target.value)}
                className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
          </div>
        </Card>

        <Card header={<h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">4. Bloqueio Rígido de Margem (G-03)</h3>}>
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-800 bg-slate-950">
            <input id="bloqueio-g03" type="checkbox" checked={bloqueioG03} readOnly disabled
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 opacity-90 cursor-not-allowed" />
            <div>
              <label htmlFor="bloqueio-g03" className="block text-xs font-bold text-slate-200 cursor-not-allowed">
                Bloquear criação de propostas com valor abaixo do piso (G-03)
              </label>
              <span className="block text-[11px] text-emerald-400 mt-1 font-mono">
                🔒 Regra de ouro RN-001 travada. Atual: {bloqueioG03 ? "ATIVO" : "INATIVO"}.
              </span>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => restoreMutation.mutate()}
            disabled={restoreMutation.isPending}
          >
            {restoreMutation.isPending ? "Restaurando…" : "Restaurar Valores Padrão"}
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando…" : "Salvar Alterações de Preço"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
