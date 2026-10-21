import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Button from "#/componentes/ux/button";
import { getCurrentUserServerFn, loginServerFn } from "#/api/auth";
import { authKeys } from "#/lib/query-keys";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { user } = await getCurrentUserServerFn();
    if (user) {
      throw redirect({ to: "/leads" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Garante que se já estiver logado, sai do /login
  useQuery({
    queryKey: authKeys.me(),
    queryFn: () => getCurrentUserServerFn(),
  });

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; senha: string }) =>
      loginServerFn({ data: input }),
    onSuccess: async (res) => {
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: authKeys.me() });
        await navigate({ to: "/leads" });
      } else {
        setErro(
          res.error === "INACTIVE"
            ? "Usuário desativado. Fale com o administrador."
            : "E-mail ou senha incorretos.",
        );
      }
    },
    onError: () => {
      setErro("Falha de comunicação. Tente novamente.");
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!email.trim() || !senha) {
      setErro("Preencha e-mail e senha");
      return;
    }
    loginMutation.mutate({ email: email.trim().toLowerCase(), senha });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-8 shadow-2xl"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-[0_0_25px_rgba(79,70,229,0.5)]">
            K
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Lead Generator</h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          Acesso restrito ao Operador
        </p>

        <label
          htmlFor="email"
          className="text-xs font-semibold tracking-wide text-slate-400"
        >
          E-MAIL
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-1 mb-4 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          placeholder="voce@kingdev.local"
        />

        <label
          htmlFor="senha"
          className="text-xs font-semibold tracking-wide text-slate-400"
        >
          SENHA
        </label>
        <div className="relative mt-1 mb-2">
          <input
            id="senha"
            type={showSenha ? "text" : "password"}
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pr-12 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowSenha((s) => !s)}
            aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
          >
            {showSenha ? "🙈" : "👁️"}
          </button>
        </div>

        {erro && (
          <p
            role="alert"
            className="text-xs text-red-400 mb-4 px-1 py-2 rounded border border-red-500/30 bg-red-500/10"
          >
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 transition-all mt-2"
        >
          {loginMutation.isPending ? "Entrando…" : "Entrar"}
        </button>

        <div className="text-xs text-center mt-4 text-slate-500">
          <Link to="/esqueci-senha" className="hover:text-slate-300">
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </main>
  );
}
