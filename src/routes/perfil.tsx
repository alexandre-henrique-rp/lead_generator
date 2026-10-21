import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import AppShell from "#/componentes/layout/app_shell";
import Button from "#/componentes/ux/button";
import { getMeServerFn, updateMeServerFn } from "#/api/operador";
import { logoutServerFn } from "#/api/auth";
import { authKeys, operadorKeys } from "#/lib/query-keys";

export const Route = createFileRoute("/perfil")({
  beforeLoad: async () => {
    const { usuario } = await getMeServerFn();
    if (!usuario) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: operadorKeys.me(),
      queryFn: () => getMeServerFn(),
    });
    return null;
  },
  component: PerfilPage,
});

function PerfilPage() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: operadorKeys.me(),
    queryFn: () => getMeServerFn(),
  });

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const u = meQuery.data?.usuario;
    if (u) {
      setNome(u.nome);
      setTelefone(u.telefone ?? "");
      setCnpj(u.cnpj ?? "");
    }
  }, [meQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () => updateMeServerFn({ data: { nome, telefone, cnpj } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: operadorKeys.me() });
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });
      setSalvo(true);
      setErro(null);
      setTimeout(() => setSalvo(false), 3000);
    },
    onError: (e) => setErro(e.message),
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutServerFn(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      window.location.href = "/login";
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    if (nome.trim().length < 2) {
      setErro("Nome deve ter pelo menos 2 caracteres");
      return;
    }
    updateMutation.mutate();
  }

  if (meQuery.isPending) {
    return (
      <AppShell title="Perfil do Operador">
        <div className="text-slate-400 text-sm">Carregando…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Perfil do Operador"
      actions={
        <div className="flex items-center gap-2">
          <Link to="/leads" className="text-xs text-slate-400 hover:text-white">
            ← Leads
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            Sair
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4"
        >
          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-slate-400">
              E-MAIL (somente leitura)
            </span>
            <input
              value={meQuery.data?.usuario?.email ?? ""}
              readOnly
              className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-slate-400">
              NOME COMPLETO
            </span>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-slate-400">
              WHATSAPP / TELEFONE
            </span>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-slate-400">
              CNPJ (opcional)
            </span>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </label>

          {erro && (
            <p
              role="alert"
              className="text-xs text-red-400 px-3 py-2 rounded border border-red-500/30 bg-red-500/10"
            >
              {erro}
            </p>
          )}

          {salvo && (
            <p
              role="status"
              className="text-xs text-emerald-400 px-3 py-2 rounded border border-emerald-500/30 bg-emerald-500/10"
            >
              ✓ Alterações salvas com sucesso
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
