import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/p/relatorio/$token")({
  head: () => ({
    meta: [
      { title: "Relatório de Acompanhamento do Projeto · King Dev Tec" },
      {
        name: "description",
        content: "Relatório de Acompanhamento e Entregas do Projeto King Dev Tec",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicRelatorioPage,
});

function PublicRelatorioPage() {
  const { token } = Route.useParams();

  const isExpired = token === "expirado";

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-16 px-4 text-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-900">Link de Relatório Expirado</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            O link de acompanhamento deste projeto foi desativado ou renovado. Entre em contato com o desenvolvedor para receber o link atualizado.
          </p>
          <a
            href="https://wa.me/5516996029107?text=Olá Alexandre, meu link de relatório de projeto expirou!"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
          >
            Falar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Público */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              K
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">King Dev Tec</h1>
              <p className="text-xs text-slate-500">Relatório de Acompanhamento em Tempo Real</p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold">
            ● Em Produção
          </span>
        </div>

        {/* Card Principal do Projeto */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Projeto do Cliente · Ref: #{token.slice(0, 8)}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              Sistema de Pedidos e Cardápio Digital
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Prazo de entrega previsto: <strong className="text-slate-800">25/11/2026</strong>
            </p>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-slate-700">Progresso Geral</span>
              <span className="font-bold text-emerald-600">70% concluído</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: "70%" }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">14 de 20 tarefas finalizadas</p>
          </div>

          {/* Entregas Realizadas */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Checklist de Entregas
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-800">✓ Briefing e Escopo Alinhados</span>
                <span className="text-[11px] text-emerald-600 font-mono font-semibold">Concluído</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-800">✓ Arquitetura & Banco de Dados</span>
                <span className="text-[11px] text-emerald-600 font-mono font-semibold">Concluído</span>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200 flex items-center justify-between">
                <span className="font-medium text-indigo-900">◐ Integração com WhatsApp Business</span>
                <span className="text-[11px] text-indigo-600 font-mono font-semibold">Em andamento</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-400">
                <span>○ Painel Administrativo de Produtos</span>
                <span className="text-[11px] font-mono">Próxima sprint</span>
              </div>
            </div>
          </div>

          {/* Contato Direto */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-800">Dúvidas sobre o andamento?</p>
              <p className="text-[11px] text-slate-500">Você fala direto com quem está programando.</p>
            </div>
            <a
              href="https://wa.me/5516996029107?text=Olá Alexandre, estou acompanhando o relatório do projeto!"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              💬 Chamar Alexandre no WhatsApp
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 font-mono">
          King Dev Tec · Engenharia de Software Solo · Ribeirão Preto/SP
        </p>
      </div>
    </div>
  );
}
