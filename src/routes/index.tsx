import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const whatsappUrl = "https://wa.me/5516996029107?text=Ol%C3%A1%20Alexandre!%20Gostaria%20de%20conversar%20sobre%20um%20projeto%20com%20a%20King%20Dev%20Tec."

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans selection:bg-indigo-500/30 relative overflow-x-hidden">
      {/* Tech Grid Background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#4f46e50d_1px,transparent_1px),linear-gradient(to_bottom,#4f46e50d_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] fixed pointer-events-none"></div>
      
      {/* Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute top-1/4 right-0 w-[450px] h-[450px] bg-pink-600/10 blur-[130px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute top-2/3 left-0 w-[500px] h-[500px] bg-indigo-900/15 blur-[160px] rounded-full pointer-events-none z-0"></div>

      {/* Floating WhatsApp Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center group">
        <a 
          href={whatsappUrl} 
          target="_blank" 
          rel="noreferrer"
          aria-label="Falar com Alexandre no WhatsApp"
          className="relative flex items-center justify-center w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-[0_0_25px_rgba(16,185,129,0.7)] transition-transform hover:scale-110 active:scale-95"
        >
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400"></span>
          </span>
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
        </a>
        <div className="hidden group-hover:block absolute right-16 bg-slate-900 border border-emerald-500/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
          Falar com Alexandre no WhatsApp (Online)
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-8 py-5 max-w-7xl mx-auto border-b border-white/5 backdrop-blur-md sticky top-0 bg-black/60">
        <Link to="/" className="flex items-center gap-3">
          <img src="/Logo_KingDevTec_04.png" alt="King Dev Tec" className="h-7 md:h-9 object-contain" />
        </Link>
        <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-400">
          <a href="#diferenciais" className="hover:text-white transition-colors">Diferenciais</a>
          <a href="#solucoes" className="hover:text-white transition-colors">Soluções</a>
          <a href="#portfolio" className="hover:text-white transition-colors">Portfólio</a>
          <a href="#processo" className="hover:text-white transition-colors">Como Funciona</a>
          <a href="#depoimentos" className="hover:text-white transition-colors">Depoimentos</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs md:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 md:px-5 py-2.5 rounded-lg shadow-[0_0_20px_-3px_rgba(79,70,229,0.7)] transition-all hover:scale-105 active:scale-95"
          >
            Solicitar Orçamento →
          </a>
          <Link 
            to="/login" 
            className="hidden sm:inline-block text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            Central Administrativa
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center pt-16 pb-24 px-6 text-center max-w-6xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 mb-8 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-mono text-indigo-300 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Engenharia de software solo · Comunicação direta · Orçamento sem compromisso
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-5xl leading-[1.1] mb-8">
          Vá da ideia ao software rodando em produção <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-pink-400 to-pink-500">sem intermediários</span> — direto com quem constrói.
        </h1>
        
        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mb-10 font-light leading-relaxed">
          Sem agências burocráticas ou camadas de gerência. Você fala direto com quem escreve cada linha. Entregas contínuas em sprints ágeis, com código aberto pra você desde o início.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-5 mb-4">
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-[0_0_30px_-5px_rgba(16,185,129,0.7)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-base"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            Solicitar Orçamento Grátis →
          </a>
          
          <a 
            href="#solucoes" 
            className="w-full sm:w-auto px-6 py-4 text-slate-400 hover:text-white font-medium transition-colors flex items-center justify-center gap-2 group"
          >
            Ou veja o que eu construo <span className="group-hover:translate-y-0.5 transition-transform">↓</span>
          </a>
        </div>

        <div className="text-xs text-slate-400 font-mono mb-16">
          Atendimento ágil direto no WhatsApp em horário comercial · Sem compromisso
        </div>

        {/* Terminal/Code snippet */}
        <div className="w-full max-w-3xl border border-white/10 rounded-2xl bg-[#090D16]/90 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col mb-16">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              <span className="ml-2 text-xs font-mono text-slate-500">king-engine ~ sprint-01.ts</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              production-ready
            </span>
          </div>
          <div className="p-6 text-left font-mono text-xs sm:text-sm text-slate-300 overflow-x-auto leading-relaxed">
            <div className="text-slate-500 mb-2">// Entrega Real da Sprint 1 — Código Aberto no Seu Git</div>
            <div className="flex"><span className="text-pink-400 mr-2">const</span> <span className="text-blue-300">mvp</span> <span className="text-white mx-2">=</span> <span className="text-indigo-300">await</span> <span className="text-green-300">KingDev.build</span>&#40;&#123;</div>
            <div className="ml-4">arquitetura: <span className="text-orange-300">'Clean Architecture + Serverless'</span>,</div>
            <div className="ml-4">database: <span className="text-orange-300">'PostgreSQL + Prisma / Drizzle'</span>,</div>
            <div className="ml-4">frontend: <span className="text-orange-300">'TanStack Start + React + Tailwind v4'</span>,</div>
            <div className="ml-4">integracoes: [<span className="text-orange-300">'WhatsApp Business API'</span>, <span className="text-orange-300">'OpenAI'</span>, <span className="text-orange-300">'Gateway de Pagamento'</span>],</div>
            <div className="ml-4">garantiaPosEntrega: <span className="text-emerald-400">true</span></div>
            <div>&#125;&#41;;</div>
            <div className="text-emerald-400 mt-3 font-semibold">✓ Infraestrutura provisionada na sua conta de nuvem</div>
            <div className="text-emerald-400 font-semibold">✓ Repositório entregue com permissão total</div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl border border-white/5 bg-white/[0.01]">
          <div className="p-4 text-center">
            <div className="text-3xl md:text-4xl font-extrabold text-white mb-1 tracking-tight">8+</div>
            <div className="text-xs font-mono text-slate-400">MVPs e Sistemas no Ar</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-3xl md:text-4xl font-extrabold text-indigo-400 mb-1 tracking-tight">100%</div>
            <div className="text-xs font-mono text-slate-400">Código Proprietário</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-3xl md:text-4xl font-extrabold text-pink-400 mb-1 tracking-tight">Sprints</div>
            <div className="text-xs font-mono text-slate-400">Ciclos Ágeis de Entrega</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-3xl md:text-4xl font-extrabold text-emerald-400 mb-1 tracking-tight">Zero</div>
            <div className="text-xs font-mono text-slate-400">Burocracia de Agência</div>
          </div>
        </div>
      </section>

      {/* Diferenciais Section */}
      <section id="diferenciais" className="relative z-10 py-24 px-6 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <div className="text-indigo-400 font-mono text-xs uppercase tracking-widest mb-3">O Modelo Anti-Agência</div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">3 motivos para contratar um dev sênior solo em vez de uma agência</h2>
            <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
              Em agências, o seu orçamento paga o café do gerente de projetos, a sala de reuniões e o comercial. Aqui, cada investimento vira código direto no seu produto.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Zero Burocracia</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Comunicação direta com o desenvolvedor. Sem ticket, sem espera de dias úteis para mudar a cor de um botão. Decisões técnicas e de produto alinhadas com rapidez.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Código que não vira refazer</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Seu produto nasce com arquitetura limpa, segurança tratada desde o primeiro commit e testes automatizados. Não é código de demonstração descartável: é código que aguenta produção e escala com segurança.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Precificação Transparente</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Orçamento transparente alinhado ao escopo real. O que combinamos na proposta técnica é o que você paga. Sem taxas ocultas, sem adicionais arbitrários na entrega.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Soluções (Comercial / Vendas) */}
      <section id="solucoes" className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <div className="text-pink-400 font-mono text-xs uppercase tracking-widest mb-3">Capacidade Técnica de Ponta a Ponta</div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">4 entregas que tiram empresas do papel</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Desenvolvimento, automação, sites e consultoria — sob medida para a sua necessidade.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {/* Sistema Web / Startups */}
            <div className="flex flex-col md:flex-row items-center border border-white/10 bg-white/[0.01] rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-colors">
              <div className="w-full md:w-1/2 p-8 md:p-12">
                <div className="text-indigo-400 font-mono text-sm mb-3">{"< MVP & Sistemas SaaS />"}</div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Sistemas de Gestão & SaaS Personalizado</h3>
                <p className="text-slate-400 mb-6 text-sm md:text-base leading-relaxed">
                  Cansado de pagar assinaturas caras em múltiplos sistemas genéricos que não se comunicam? Eu construo a plataforma centralizada do seu negócio — painel administrativo, portal do cliente, integrações e o core do seu produto SaaS.
                </p>
                <ul className="space-y-2.5 mb-8 text-sm">
                  <li className="flex items-center text-slate-300"><span className="text-indigo-400 mr-2 font-bold">✓</span> Dashboards administrativos (Admin Panels de alta performance)</li>
                  <li className="flex items-center text-slate-300"><span className="text-indigo-400 mr-2 font-bold">✓</span> Portais do Cliente & Área de Membros</li>
                  <li className="flex items-center text-slate-300"><span className="text-indigo-400 mr-2 font-bold">✓</span> Stack moderna (TanStack, React, Node.js, Postgres)</li>
                </ul>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium text-sm group"
                >
                  Quero desenvolver um sistema sob medida <span className="group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </div>
              <div className="w-full md:w-1/2 p-8 md:p-12 bg-[#050505] flex justify-center border-l border-white/5 min-h-[280px] items-center">
                 <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.02] p-5 shadow-2xl">
                    <div className="w-full h-3 bg-white/10 rounded mb-4"></div>
                    <div className="flex gap-4">
                      <div className="w-1/3 h-20 bg-indigo-500/20 border border-indigo-500/30 rounded-lg"></div>
                      <div className="w-2/3 h-20 bg-white/5 rounded-lg"></div>
                    </div>
                    <div className="w-full h-8 bg-white/5 rounded-lg mt-4 flex items-center px-3">
                      <div className="w-16 h-2 bg-indigo-400/40 rounded"></div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Bots e Automação */}
            <div className="flex flex-col md:flex-row-reverse items-center border border-white/10 bg-white/[0.01] rounded-2xl overflow-hidden hover:border-pink-500/50 transition-colors">
              <div className="w-full md:w-1/2 p-8 md:p-12">
                <div className="text-pink-400 font-mono text-sm mb-3">{"[ Bots & IA Generativa ]"}</div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Bots Inteligentes para WhatsApp & Automações</h3>
                <p className="text-slate-400 mb-6 text-sm md:text-base leading-relaxed">
                  Atendimento ágil no WhatsApp, sem responder a mesma pergunta repetitiva o dia todo. O bot lê seu banco de dados, envia informações, qualifica leads e agenda reuniões no seu calendário — tudo de forma fluida.
                </p>
                <ul className="space-y-2.5 mb-8 text-sm">
                  <li className="flex items-center text-slate-300"><span className="text-pink-400 mr-2 font-bold">✓</span> Atendimento oficial via WhatsApp Cloud API</li>
                  <li className="flex items-center text-slate-300"><span className="text-pink-400 mr-2 font-bold">✓</span> Integração com IA (OpenAI / Claude) treinada no seu negócio</li>
                  <li className="flex items-center text-slate-300"><span className="text-pink-400 mr-2 font-bold">✓</span> Automação de agendamentos e funil comercial</li>
                </ul>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-pink-400 hover:text-pink-300 font-medium text-sm group"
                >
                  Quero automatizar meu WhatsApp <span className="group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </div>
              <div className="w-full md:w-1/2 p-8 md:p-12 bg-[#050505] flex justify-center border-r border-white/5 min-h-[280px] items-center">
                 <div className="w-full max-w-sm flex flex-col gap-3">
                    <div className="w-4/5 p-3.5 rounded-2xl rounded-tl-sm bg-white/5 self-start text-xs sm:text-sm text-slate-300 border border-white/5">
                      Olá! Quero automatizar o envio de orçamentos pelo WhatsApp.
                    </div>
                    <div className="w-4/5 p-3.5 rounded-2xl rounded-tr-sm bg-indigo-600/25 border border-indigo-500/40 self-end text-xs sm:text-sm text-white">
                      Perfeito! O bot qualifica o cliente, consulta a tabela no sistema e gera a proposta em PDF na hora.
                    </div>
                 </div>
              </div>
            </div>

            {/* Sites */}
            <div className="flex flex-col md:flex-row items-center border border-white/10 bg-white/[0.01] rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-colors">
              <div className="w-full md:w-1/2 p-8 md:p-12">
                <div className="text-emerald-400 font-mono text-sm mb-3">{"< Frontend de Alta Performance />"}</div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Sites e Landing Pages de Alta Conversão</h3>
                <p className="text-slate-400 mb-6 text-sm md:text-base leading-relaxed">
                  Landing page que carrega com velocidade extrema no celular e converte visitantes em clientes reais. Sem templates pesados, código limpo e proprietário, seu para sempre.
                </p>
                <ul className="space-y-2.5 mb-8 text-sm">
                  <li className="flex items-center text-slate-300"><span className="text-emerald-400 mr-2 font-bold">✓</span> Páginas para lançamentos e produtos com alta taxa de conversão</li>
                  <li className="flex items-center text-slate-300"><span className="text-emerald-400 mr-2 font-bold">✓</span> Otimização técnica de SEO e carregamento veloz</li>
                  <li className="flex items-center text-slate-300"><span className="text-emerald-400 mr-2 font-bold">✓</span> Design responsivo adaptado para qualquer tela</li>
                </ul>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium text-sm group"
                >
                  Quero um site de alta conversão <span className="group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </div>
              <div className="w-full md:w-1/2 p-8 md:p-12 bg-[#050505] flex justify-center border-l border-white/5 min-h-[280px] items-center">
                 <div className="w-full max-w-sm flex flex-col gap-3">
                    <div className="w-full h-8 border border-white/10 bg-white/5 rounded-t-lg flex items-center justify-between px-3">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                      </div>
                      <div className="w-16 h-2 bg-emerald-400/40 rounded-full font-mono text-[9px] text-emerald-400 flex items-center justify-center">100/100</div>
                    </div>
                    <div className="w-full h-36 bg-emerald-500/10 rounded-b-lg border border-emerald-500/20 border-t-0 flex flex-col items-center justify-center gap-2 p-4">
                       <div className="w-1/2 h-3 bg-white/30 rounded-full"></div>
                       <div className="w-3/4 h-2 bg-white/10 rounded-full"></div>
                       <div className="w-28 h-7 bg-emerald-500/40 rounded-md mt-2 flex items-center justify-center text-[10px] text-emerald-200 font-mono">
                          LCP: 0.8s (Fast)
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Consultoria */}
            <div className="flex flex-col md:flex-row-reverse items-center border border-white/10 bg-white/[0.01] rounded-2xl overflow-hidden hover:border-orange-500/50 transition-colors">
              <div className="w-full md:w-1/2 p-8 md:p-12">
                <div className="text-orange-400 font-mono text-sm mb-3">{"$ consultoria --tech"}</div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Consultoria e Arquitetura de Software</h3>
                <p className="text-slate-400 mb-6 text-sm md:text-base leading-relaxed">
                  Tem um time de desenvolvimento mas precisa de direcionamento sênior? Ajudo sua empresa a desenhar arquiteturas escaláveis, resolver gargalos de lentidão e estabelecer boas práticas de código.
                </p>
                <ul className="space-y-2.5 mb-8 text-sm">
                  <li className="flex items-center text-slate-300"><span className="text-orange-400 mr-2 font-bold">✓</span> Auditoria de arquitetura, banco de dados e APIs</li>
                  <li className="flex items-center text-slate-300"><span className="text-orange-400 mr-2 font-bold">✓</span> Resolução de gargalos de performance e escalabilidade</li>
                  <li className="flex items-center text-slate-300"><span className="text-orange-400 mr-2 font-bold">✓</span> Mentoria técnica e plano de ação objetivo</li>
                </ul>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium text-sm group"
                >
                  Agendar consultoria técnica <span className="group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </div>
              <div className="w-full md:w-1/2 p-8 md:p-12 bg-[#050505] flex justify-center border-r border-white/5 min-h-[280px] items-center">
                 <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black p-5 font-mono text-xs text-slate-400 shadow-2xl flex flex-col gap-2">
                    <div className="text-orange-400 mb-1 font-semibold"># Auditoria de Performance</div>
                    <div><span className="text-pink-400">{">"}</span> Consultando índices do Postgres...</div>
                    <div className="text-emerald-400 font-semibold">[OK] Tempo de query reduzido com precisão</div>
                    <div><span className="text-pink-400">{">"}</span> Otimizando camadas de cache...</div>
                    <div className="text-emerald-400 font-semibold">[OK] Carga do servidor otimizada com sucesso</div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfólio Section */}
      <section id="portfolio" className="relative z-10 py-24 px-6 bg-black/40 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="text-indigo-400 font-mono text-xs uppercase tracking-widest mb-3">Cases Reais de Produção</div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">De ideia a produção: cases reais</h2>
              <p className="text-slate-400 text-lg max-w-xl">
                Cada um desses começou no planejamento de requisitos. Hoje roda em produção atendendo clientes reais.
              </p>
            </div>
            <a 
              href="https://github.com/alexandre-henrique-rp" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.06] text-white transition-all text-sm font-medium hover:scale-105"
            >
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              Ver GitHub do Desenvolvedor
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Project 1 - SisNato */}
            <a 
              href="https://sisnato.com.br/" 
              target="_blank" 
              rel="noreferrer" 
              className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] hover:border-indigo-500/50 transition-all flex flex-col block"
            >
              <div className="h-64 bg-slate-950 relative overflow-hidden border-b border-white/5">
                <img 
                  src="/sisnato.png" 
                  alt="ERP SisNato - Gestão de Certificação e Assinatura Digital" 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-full bg-indigo-600/90 text-white shadow-lg backdrop-blur-md">
                    ★ Desenvolvedor Chefe
                  </span>
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">ERP Imobiliário</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">ICP-Brasil</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">Correspondente Caixa (CCA)</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">Assinatura Digital</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                      SisNato — ERP Digital
                    </h3>
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    Imobiliárias e corretores fecham contratos com assinatura digital ICP-Brasil válida juridicamente. Contratos imobiliários processados com alta segurança e conformidade total.
                  </p>
                  <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/20 inline-block">
                    ✓ Emissão ICP-Brasil integrada à Caixa
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs text-indigo-400 font-mono">
                  sisnato.com.br ↗
                </div>
              </div>
            </a>

            {/* Project 2 - Oi Doutor Telemedicina */}
            <a 
              href="https://www.oidoutortelemedicina.com.br/" 
              target="_blank" 
              rel="noreferrer" 
              className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] hover:border-emerald-500/50 transition-all flex flex-col block"
            >
              <div className="h-64 bg-slate-950 relative overflow-hidden border-b border-white/5">
                <img 
                  src="/oidoutor.png" 
                  alt="Oi Doutor Saúde Digital - Plataforma de Telemedicina" 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-full bg-emerald-600/90 text-white shadow-lg backdrop-blur-md">
                    ★ Desenvolvedor Principal (MVP)
                  </span>
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">HealthTech</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">Telemedicina</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">Vídeo ao Vivo</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">MVP</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Oi Doutor Telemedicina
                    </h3>
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    Desenvolvimento e arquitetura das versões de MVP da plataforma de telemedicina: consultas por vídeo ao vivo, prontuário eletrônico e conformidade rigorosa com a LGPD.
                  </p>
                  <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/20 inline-block">
                    ✓ Consultas médicas remotas e prontuário no ar
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs text-emerald-400 font-mono">
                  oidoutortelemedicina.com.br ↗
                </div>
              </div>
            </a>

            {/* Project 3 - GreenInvest */}
            <a 
              href="https://www.greeninvest.com.br/" 
              target="_blank" 
              rel="noreferrer" 
              className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] hover:border-teal-500/50 transition-all flex flex-col block"
            >
              <div className="h-64 bg-slate-950 relative overflow-hidden border-b border-white/5">
                <img 
                  src="/greeninvest.png" 
                  alt="GreenInvest - Fintech e Investimentos Sustentáveis" 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-full bg-teal-600/90 text-white shadow-lg backdrop-blur-md">
                    ★ Dev Especialista Blockchain & Web3
                  </span>
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">Fintech</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">Blockchain</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">Web3</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">EcoCharge</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-white group-hover:text-teal-400 transition-colors">
                      GreenInvest
                    </h3>
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    Infraestrutura blockchain para fintech de eletropostos EcoCharge. Governança on-chain auditável para investidores ativos e liquidação de transações seguras.
                  </p>
                  <div className="text-xs font-mono text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded border border-teal-500/20 inline-block">
                    ✓ Transações on-chain com alta performance
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs text-teal-400 font-mono">
                  greeninvest.com.br ↗
                </div>
              </div>
            </a>

            {/* Project 4 - Agente IA */}
            <div className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] hover:border-pink-500/50 transition-all flex flex-col">
              <div className="h-64 bg-slate-900 relative overflow-hidden border-b border-white/5 flex items-center justify-center">
                <div className="absolute inset-0 bg-pink-900/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-48 h-5/6 border border-white/10 rounded-xl shadow-2xl bg-[#0a0a0a] flex flex-col">
                   <div className="h-8 border-b border-white/10 flex justify-center items-center">
                     <div className="w-12 h-1 rounded-full bg-slate-700"></div>
                   </div>
                   <div className="p-4 flex flex-col gap-3">
                     <div className="w-2/3 p-2 bg-white/5 rounded-lg rounded-tl-sm self-start"></div>
                     <div className="w-3/4 p-3 bg-pink-500/20 border border-pink-500/30 rounded-lg rounded-tr-sm self-end"></div>
                     <div className="w-1/2 p-2 bg-white/5 rounded-lg rounded-tl-sm self-start mt-2"></div>
                   </div>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-full bg-pink-600/90 text-white shadow-lg backdrop-blur-md">
                    ★ Automação & IA
                  </span>
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">WhatsApp API</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">OpenAI</span>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">Webhooks</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">Agente IA de Vendas</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    Atendimento com IA generativa conectada ao WhatsApp oficial: qualifica leads comerciais, responde dúvidas frequentes e agenda reuniões no seu calendário.
                  </p>
                  <div className="text-xs font-mono text-pink-400 bg-pink-500/10 px-3 py-1.5 rounded border border-pink-500/20 inline-block">
                    ✓ Resposta imediata para novos leads
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs text-pink-400 font-mono">
                  Solução Customizada ↗
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Trabalho / Metodologia */}
      <section id="processo" className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <div className="text-indigo-400 font-mono text-xs uppercase tracking-widest mb-3">Processo Transparente</div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Como funciona a parceria</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Sem mistério ou promessas vagas. Um processo objetivo desenhado para colocar seu software no ar sem dor de cabeça.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.01] relative overflow-hidden group">
              <div className="text-5xl font-extrabold text-white/10 font-mono mb-4 group-hover:text-indigo-500/30 transition-colors">01</div>
              <h3 className="text-xl font-bold text-white mb-2">Diagnóstico Técnico Inicial</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Conversa objetiva no WhatsApp ou chamada de vídeo para entender o modelo de negócio, mapear gargalos e definir as funcionalidades prioritárias.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.01] relative overflow-hidden group">
              <div className="text-5xl font-extrabold text-white/10 font-mono mb-4 group-hover:text-pink-500/30 transition-colors">02</div>
              <h3 className="text-xl font-bold text-white mb-2">Escopo & Proposta Sob Medida</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Entrega de proposta técnica detalhada com escopo alinhado à sua necessidade real e investimento transparente. Você sabe exatamente o que esperar.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.01] relative overflow-hidden group">
              <div className="text-5xl font-extrabold text-white/10 font-mono mb-4 group-hover:text-emerald-500/30 transition-colors">03</div>
              <h3 className="text-xl font-bold text-white mb-2">Sprints com Validação Contínua</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Você acompanha o software funcionando em ambiente de testes ao longo de cada ciclo. Sem "caixa preta" e sem surpresas no produto final.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.01] relative overflow-hidden group">
              <div className="text-5xl font-extrabold text-white/10 font-mono mb-4 group-hover:text-teal-500/30 transition-colors">04</div>
              <h3 className="text-xl font-bold text-white mb-2">Deploy + Garantia Pós-Entrega</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Deploy na sua infraestrutura, repositório 100% transferido para você e período de garantia para correções e suporte técnico.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Redução de Risco / Garantia */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-7xl mx-auto p-8 md:p-12 rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-950/40 via-black to-pink-950/20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Compromisso e Segurança para você</h3>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl">
              Código-fonte seu desde o início. Total transparência em cada entrega técnica e suporte garantido.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 rounded-xl">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              NDA e Sigilo Comercial Garantidos
            </div>
          </div>
        </div>
      </section>

      {/* Quem está por trás */}
      <section id="sobre" className="relative z-10 py-24 px-6 border-t border-white/5 bg-black/60">
        <div className="max-w-4xl mx-auto p-8 md:p-12 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 text-center md:text-left">
            <div className="text-indigo-400 font-mono text-xs uppercase tracking-widest mb-2">Quem está por trás</div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Engenheiro Sênior focado em resultados de negócio</h2>
            <p className="text-slate-300 text-base leading-relaxed mb-6 font-light">
              Olá! Sou Alexandre Henrique, fundador e desenvolvedor à frente da King Dev Tec. Ao longo dos últimos anos liderei a engenharia de ERPs com certificação ICP-Brasil, plataformas de telemedicina e fintechs em Web3. 
            </p>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Criei a King Dev Tec com um objetivo simples: eliminar o intermediário caro e burocrático para que fundadores e empresários possam tirar suas ideias do papel com a agilidade que o mercado exige.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <a 
                href="https://github.com/alexandre-henrique-rp" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 text-xs font-mono px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.06] text-slate-200 hover:text-white transition-all shadow-sm hover:scale-105"
              >
                <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                <span>GitHub:</span>
                <span className="text-slate-400">@alexandre-henrique-rp</span>
              </a>
              <a 
                href="https://www.linkedin.com/in/dev-alexandre-henrique" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 text-xs font-mono px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#0A66C2]/60 hover:bg-white/[0.06] text-slate-200 hover:text-white transition-all shadow-sm hover:scale-105"
              >
                <svg className="w-4 h-4 fill-[#0A66C2]" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
                <span>LinkedIn:</span>
                <span className="text-slate-400">/dev-alexandre-henrique</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Prova Social / Depoimentos */}
      <section id="depoimentos" className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <div className="text-pink-400 font-mono text-xs uppercase tracking-widest mb-3">Prova Social</div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">O que dizem os fundadores</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Resultados reais gerados para quem confiou seus sistemas à King Dev Tec.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.01] flex flex-col justify-between">
              <div>
                <div className="flex text-amber-400 mb-4">★★★★★</div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">
                  "O Alexandre liderou toda a arquitetura do nosso ERP do zero. Hoje conectamos construtoras, correspondentes Caixa e certificadoras no Brasil inteiro com assinatura ICP-Brasil sem falhas de performance."
                </p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <div className="font-bold text-white text-sm">Diretoria de Tecnologia</div>
                <div className="text-xs text-indigo-400 font-mono">SisNato Digital</div>
              </div>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.01] flex flex-col justify-between">
              <div>
                <div className="flex text-amber-400 mb-4">★★★★★</div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">
                  "Colocamos a plataforma de telemedicina no ar com muita agilidade. O desenvolvimento do MVP com chamadas de vídeo funcionais foi o que nos permitiu validar a empresa rapidamente com os primeiros médicos."
                </p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <div className="font-bold text-white text-sm">Coordenação de Produto</div>
                <div className="text-xs text-emerald-400 font-mono">Oi Doutor Saúde Digital</div>
              </div>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.01] flex flex-col justify-between">
              <div>
                <div className="flex text-amber-400 mb-4">★★★★★</div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">
                  "A senioridade em Web3 e arquitetura de transações on-chain foi um divisor de águas. Sem reuniões desnecessárias, direto ao ponto no código e nas entregas da fintech."
                </p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <div className="font-bold text-white text-sm">Operações & Estruturação</div>
                <div className="text-xs text-teal-400 font-mono">GreenInvest Fintech</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-24 px-6 border-t border-white/5 bg-black/50">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16 text-center">
            <div className="text-indigo-400 font-mono text-xs uppercase tracking-widest mb-3">Tire Suas Dúvidas</div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Perguntas Frequentes</h2>
            <p className="text-slate-400 text-lg">
              Tudo o que você precisa saber antes de iniciar seu projeto.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Como funciona a precificação de um MVP ou Sistema?",
                a: "A precificação é calculada sob medida, baseada estritamente na complexidade técnica e no escopo acordado, sem taxas arbitrárias de agência. Após nosso diagnóstico inicial, apresento uma proposta transparente com escopo fechado — você avalia o investimento exato antes de qualquer contratação."
              },
              {
                q: "Qual o cronograma de entrega do projeto?",
                a: "O cronograma é dimensionado de acordo com o volume de funcionalidades e integrações necessárias. Adoto metodologia ágil com sprints contínuas, garantindo que você teste e valide entregas funcionais desde os primeiros ciclos de desenvolvimento."
              },
              {
                q: "Quem é o dono do código-fonte e da propriedade intelectual?",
                a: "Você. 100% dos direitos, repositório Git, banco de dados e contas de nuvem são criados no seu nome ou transferidos integralmente na entrega. Sem travas ou dependências forçadas."
              },
              {
                q: "Vocês assinam Acordo de Confidencialidade (NDA)?",
                a: "Sim, com certeza. A proteção da sua ideia, do seu modelo de negócio e dos seus dados comerciais é prioridade absoluta."
              },
              {
                q: "Como funciona o suporte após o lançamento?",
                a: "Todo projeto inclui um período de garantia pós-entrega para correções e ajustes técnicos. Caso deseje evoluções contínuas, disponibilizo acompanhamento mensal ou novas sprints sob demanda."
              },
              {
                q: "Qual a diferença entre contratar a King Dev Tec e uma agência tradicional?",
                a: "Em uma agência você fala com vendedores, depois com gerentes de conta, que repassam para programadores júniors. Na King Dev Tec você interage diretamente com um engenheiro sênior que já liderou grandes plataformas em produção, garantindo agilidade real e investimento otimizado."
              }
            ].map((item, index) => (
              <div 
                key={index} 
                className="border border-white/10 rounded-2xl bg-white/[0.01] overflow-hidden transition-colors hover:border-white/20"
              >
                <button 
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left p-6 font-semibold text-white flex justify-between items-center gap-4 text-base md:text-lg cursor-pointer"
                >
                  <span>{item.q}</span>
                  <span className="text-indigo-400 text-xl font-mono">{openFaq === index ? "−" : "+"}</span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-slate-400 text-sm md:text-base leading-relaxed border-t border-white/5 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section & Contact */}
      <section id="contato" className="relative z-20 py-28 px-6">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-indigo-950/70 via-black to-pink-950/40 border border-indigo-500/40 rounded-3xl p-8 md:p-16 text-center shadow-[0_0_60px_-15px_rgba(79,70,229,0.5)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-pink-500/10 blur-[110px] rounded-full pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-mono text-amber-300">
            <span>⚠️</span> Vagas limitadas: Atendimento a projetos selecionados por ciclo
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 relative z-10">
            Vamos tirar seu projeto do papel <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">com agilidade e precisão</span>?
          </h2>
          <p className="text-slate-300 text-base md:text-lg mb-10 max-w-2xl mx-auto relative z-10 font-light leading-relaxed">
            Me conta em uma mensagem o que você precisa. Respondo com as perguntas certas e um caminho técnico honesto — mesmo que a resposta seja "não sou o dev certo pra isso".
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-5 relative z-10 mb-8">
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.7)] transition-all hover:scale-105 active:scale-95 text-base"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              Falar com Alexandre no WhatsApp →
            </a>
            
            <a 
              href="mailto:contato@kingdevtec.com" 
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-colors text-base"
            >
              Ou prefere e-mail? contato@kingdevtec.com →
            </a>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Atendimento ágil direto no WhatsApp em horário comercial
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/10 bg-black text-center md:text-left">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center">
            <img src="/Logo_KingDevTec_01.png" alt="King Dev Tec" className="h-16 md:h-20 object-contain" />
          </div>
          
          <div className="text-slate-500 text-xs md:text-sm font-mono text-center">
            © {new Date().getFullYear()} King Dev Tec — Engenharia de Software Solo. Todos os direitos reservados.
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href="https://github.com/alexandre-henrique-rp" 
              target="_blank" 
              rel="noreferrer" 
              className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-all hover:scale-105 shadow-sm"
              aria-label="GitHub do Desenvolvedor"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
            </a>
            <a 
              href="https://www.linkedin.com/in/dev-alexandre-henrique" 
              target="_blank" 
              rel="noreferrer" 
              className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#0A66C2]/60 hover:bg-white/[0.08] flex items-center justify-center text-[#0A66C2] transition-all hover:scale-105 shadow-sm"
              aria-label="LinkedIn do Desenvolvedor"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
