import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Button from "#/componentes/ux/button";
import { esqueciSenhaServerFn } from "#/api/auth";

export const Route = createFileRoute("/esqueci-senha")({
  component: EsqueciSenhaPage,
});

function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [tokenDev, setTokenDev] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { email: string }) =>
      esqueciSenhaServerFn({ data: input }),
    onSuccess: (res) => {
      setEnviado(true);
      if (res.tokenGerado) setTokenDev(res.tokenGerado);
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    mutation.mutate({ email: email.trim().toLowerCase() });
  }

  if (enviado) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl">
            ✓
          </div>
          <h1 className="text-xl font-bold mb-2">E-mail enviado</h1>
          <p className="text-sm text-slate-400 mb-4">
            Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá
            um link para redefinir a senha.
          </p>
          {tokenDev && (
            <div className="text-left rounded border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] font-mono text-amber-200">
              <div className="text-amber-300 font-semibold mb-1">
                🔧 Modo dev — token gerado:
              </div>
              <code className="break-all">{tokenDev}</code>
              <p className="mt-2 text-amber-300/80 font-sans">
                Em produção, este token é enviado por e-mail. Aqui, copie e use
                em <code>POST /api/auth/reset</code> com <code>novaSenha</code>.
              </p>
            </div>
          )}
          <div className="mt-6">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              ← Voltar para o login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-8 shadow-2xl"
      >
        <h1 className="text-xl font-bold text-center mb-2">Esqueci minha senha</h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          Informe o e-mail cadastrado para receber o link de redefinição.
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
          className="w-full mt-1 mb-4 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          placeholder="voce@kingdev.local"
        />

        {mutation.isError && (
          <p
            role="alert"
            className="text-xs text-red-400 mb-4 px-3 py-2 rounded border border-red-500/30 bg-red-500/10"
          >
            Falha ao enviar. Tente novamente.
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          isLoading={mutation.isPending}
        >
          {mutation.isPending ? "Enviando…" : "Enviar link de redefinição"}
        </Button>

        <div className="text-xs text-center mt-4 text-slate-500">
          <Link to="/login" className="hover:text-slate-300">
            ← Voltar para o login
          </Link>
        </div>
      </form>
    </main>
  );
}
