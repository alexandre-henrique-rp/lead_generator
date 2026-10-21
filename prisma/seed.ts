// ==========================================================================
// lead_generator — seed.ts
// --------------------------------------------------------------------------
// Popula o banco de desenvolvimento com dados mínimos para navegar
// todas as rotas. Idempotente: usa upsert.
//
// Como rodar:
//   cd lead_generator && npm run db:seed
//
// Credenciais (Operador real):
//   e-mail: kingdevtec@gmail.com
//   senha:  @Lexandre230188
// ==========================================================================

import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Bcrypt hash pré-computado de "@Lexandre230188" (cost 12).
// Hard-coded para o seed não depender de bcryptjs no momento da execução
// (pnpm + tsx tem problema de resolução a partir de prisma/seed.ts).
const SENHA_OPERADOR_HASH =
	"$2b$12$IAY/cp4UyW/6XJWzaw4tcONJL5ZOPx/fzL/EQ3OZVFAcFM9KZTApK";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";

const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding lead_generator database…");
  console.log(`  DATABASE_URL = ${DATABASE_URL}`);

  // ── 0. Migração: normalizar CNPJs com máscara (legado de CSV) ──
  const leadsComCnpj = await prisma.lead.findMany({
    where: { cnpj: { not: null } },
    select: { id: true, cnpj: true },
  });
  let migrados = 0;
  for (const l of leadsComCnpj) {
    if (!l.cnpj) continue;
    const digits = l.cnpj.replace(/\D/g, "");
    if (digits.length === 14 && digits !== l.cnpj) {
      await prisma.lead.update({
        where: { id: l.id },
        data: { cnpj: digits, cnpjNorm: digits },
      });
      migrados += 1;
    }
  }
  if (migrados > 0) {
    console.log(`  ok   Migração: ${migrados} CNPJ(s) normalizado(s) (sem pontos/traços)`);
  }

  // ── 0b. Migração: normalizar emails para lowercase ──
  const leadsComEmail = await prisma.lead.findMany({
    where: { OR: [{ email: { not: null } }, { emailCnpj: { not: null } }] },
    select: { id: true, email: true, emailCnpj: true },
  });
  let emailsMigrados = 0;
  for (const l of leadsComEmail) {
    const lower = l.email?.toLowerCase().trim() || null;
    const cnpjLower = l.emailCnpj?.toLowerCase().trim() || null;
    if (lower !== l.email || cnpjLower !== l.emailCnpj) {
      await prisma.lead.update({
        where: { id: l.id },
        data: { email: lower, emailCnpj: cnpjLower },
      });
      emailsMigrados += 1;
    }
  }
  if (emailsMigrados > 0) {
    console.log(`  ok   Migração: ${emailsMigrados} e-mail(s) normalizado(s) (lowercase)`);
  }

  // ── 1. Operador (REAL) ──────────────────────────────────────────────
  const operador = await prisma.usuario.upsert({
    where: { email: "kingdevtec@gmail.com" },
    update: {
      nome: "Alexandre Henrique da Rocha Ararujo",
      senhaHash: SENHA_OPERADOR_HASH,
      isActive: true,
    },
    create: {
      nome: "Alexandre Henrique da Rocha Ararujo",
      email: "kingdevtec@gmail.com",
      telefone: null,
      cnpj: null,
      senhaHash: SENHA_OPERADOR_HASH,
      isActive: true,
    },
  });
  console.log(`  ok   Usuario (Operador): ${operador.email} [id=${operador.id}]`);

  // ── 2. PriceConfig (singleton, id=1) ───────────────────────────────
  await prisma.priceConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      custoHoraCentavos: 6059,
      precoHoraTabelaCentavos: 9500,
      margemMinima: 1.5,
      regime: "SIMPLES_NACIONAL_ANEXO_III",
      aliquotaImpostos: 0.06,
      prolaboreCentavos: 224000,
      inssAliquota: 0.11,
      reservaMesesVazios: 0.1,
      custoFixoMensalCentavos: 350000,
      bloqueioPiso: true,
    },
  });
  console.log("  ok   PriceConfig (singleton)");

  // ── 3. ConfiguracaoEmpresa (singleton) ─────────────────────────────
  await prisma.configuracaoEmpresa.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      razaoSocial: "KING DEV · TEC LTDA",
      cnpj: "30.367.375/0001-55",
      endereco: "Ribeirão Preto/SP",
    },
  });
  console.log("  ok   ConfiguracaoEmpresa (singleton)");

  // ── 3b. ConfiguracaoIntegracao (singleton, id=1) ──────────────────
  // Chaves de API (AIsa, Google Maps, Gemini, OpenRouter, SMTP) ficam no
  // banco e são editadas em Configurações → Integrações. O seed só cria a
  // linha vazia; as chaves são cadastradas pela tela.
  await prisma.configuracaoIntegracao.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  console.log("  ok   ConfiguracaoIntegracao (singleton)");

  // ── 4. Lead de exemplo (Padaria do João — enriquecido) ─────────────
  const leadExistente = await prisma.lead.findFirst({
    where: { telefoneNorm: "16996029107" },
  });
  const lead =
    leadExistente ??
    (await prisma.lead.create({
      data: {
        nome: "Padaria do João",
        razaoSocial: "Panificadora Silva & João Ltda",
        cnpj: "12345678000195", // somente dígitos
        cnpjNorm: "12345678000195",
        telefone: "16996029107",
        telefoneNorm: "16996029107",
        emails: JSON.stringify(["contato@padariadojoao.com.br"]),
        cep: "14020260",
        logradouro: "Avenida Independência",
        numero: "1200",
        bairro: "Alto da Boa Vista",
        cidade: "Ribeirão Preto",
        uf: "SP",
        origem: "MANUAL",
        etapaFunil: "QUALIFICADO",
        temWhatsapp: true,
        observacoes:
          "Interessados em automação de pedidos para entrega e cardápio digital via WhatsApp.",
        // enriquecimento CNPJ
        nomeFantasia: "Padaria do João",
        identificadorMatrizFilial: 1,
        descricaoMatrizFilial: "MATRIZ",
        situacaoCadastral: 2,
        descricaoSituacaoCadastral: "ATIVA",
        dataSituacaoCadastral: new Date("2020-01-15"),
        dataInicioAtividade: new Date("2020-01-15"),
        cnaeFiscal: 4721100,
        cnaeFiscalDescricao:
          "Comércio varejista de produtos de padaria, laticínio, doces, balas e semelhantes",
        codigoNaturezaJuridica: 2062,
        naturezaJuridica: "Sociedade Empresária Limitada",
        capitalSocialCentavos: 1000000, // R$ 10.000,00
        porte: "MICRO EMPRESA",
        codigoPorte: 1,
        municipio: "Ribeirão Preto",
        codigoMunicipio: 3543402,
        codigoMunicipioIbge: 3543402,
        dddTelefone1: "1636363636",
        emailCnpj: "contato@padariadojoao.com.br",
        opcaoPeloSimples: true,
        dataOpcaoPeloSimples: new Date("2020-01-15"),
        dataUltimaConsultaCnpj: new Date(),
        jsonCnaesSecundarios: JSON.stringify([
          { codigo: 5620104, descricao: "Fornecimento de alimentos preparados preponderantemente para consumo domiciliar" },
          { codigo: 4721100, descricao: "Comércio varejista de produtos de padaria, laticínio, doces, balas e semelhantes" },
        ]),
        jsonRegimeTributario: JSON.stringify([
          { ano: 2024, forma_de_tributacao: "Simples Nacional", quantidade_de_escrituracoes: 0 },
        ]),
      },
    }));
  console.log("  ok   Lead (Padaria do João) + enriquecido");

  // ── 5. Projeto + Sprints + Tasks ────────────────────────────────────
  const projExistente = await prisma.projeto.findFirst({
    where: { leadId: lead.id, nome: "Sistema de Pedidos e Cardápio Digital" },
  });
  let projeto = projExistente;
  if (!projeto) {
    projeto = await prisma.projeto.create({
      data: {
        leadId: lead.id,
        nome: "Sistema de Pedidos e Cardápio Digital",
        descricao: "App de pedidos via WhatsApp + cardápio digital para a Padaria do João.",
        estado: "EM_DESENVOLVIMENTO",
        progresso: 70,
        dataInicio: new Date("2026-10-01"),
        dataEntregaPrevista: new Date("2026-11-25"),
        valorTotalCentavos: 1200000,
        statusPagamento: "PENDENTE",
      },
    });
    console.log("  ok   Projeto (Sistema de Pedidos)");

    const sp1 = await prisma.sprint.create({
      data: {
        projetoId: projeto.id,
        nome: "Sprint 1 — Setup & Auth",
        ordem: 0,
        dataInicio: new Date("2026-10-01"),
        dataFim: new Date("2026-10-14"),
        tempoGastoHoras: 18,
        status: "CONCLUIDA",
      },
    });
    const sp2 = await prisma.sprint.create({
      data: {
        projetoId: projeto.id,
        nome: "Sprint 2 — MVP Core & APIs",
        ordem: 1,
        dataInicio: new Date("2026-10-15"),
        dataFim: new Date("2026-10-28"),
        tempoGastoHoras: 14,
        status: "EM_ANDAMENTO",
      },
    });
    await prisma.sprint.create({
      data: {
        projetoId: projeto.id,
        nome: "Sprint 3 — Dashboard & Testes",
        ordem: 2,
        dataInicio: new Date("2026-10-29"),
        dataFim: new Date("2026-11-12"),
        tempoGastoHoras: 0,
        status: "PLANEJAMENTO",
      },
    });

    await prisma.task.create({
      data: {
        projetoId: projeto.id,
        sprintId: sp1.id,
        nome: "Provisionamento Nuvem & PostgreSQL",
        ordem: 0,
        status: "CONCLUIDA",
        subtasks: {
          create: [
            { nome: "Criar projeto Railway", concluida: true, ordem: 0 },
            { nome: "Configurar Postgres", concluida: true, ordem: 1 },
          ],
        },
      },
    });
    await prisma.task.create({
      data: {
        projetoId: projeto.id,
        sprintId: sp1.id,
        nome: "Autenticação Magic Link & Sessões",
        ordem: 1,
        status: "CONCLUIDA",
      },
    });
    await prisma.task.create({
      data: {
        projetoId: projeto.id,
        sprintId: sp2.id,
        nome: "Integração WhatsApp Business API",
        ordem: 0,
        status: "EM_ANDAMENTO",
      },
    });
    await prisma.task.create({
      data: {
        projetoId: projeto.id,
        sprintId: sp2.id,
        nome: "Pipeline de Mensagens & Fila IA",
        ordem: 1,
        status: "A_FAZER",
      },
    });
    console.log("  ok   3 sprints + 4 tasks");
  }

  // ── 6. Parcelas ──────────────────────────────────────────────────────
  const parcExistente = await prisma.parcela.count({ where: { projetoId: projeto.id } });
  if (parcExistente === 0) {
    await prisma.parcela.createMany({
      data: [
        { projetoId: projeto.id, numero: 1, valorCentavos: 400000, dataVencimento: new Date("2026-10-25"), status: "PENDENTE" },
        { projetoId: projeto.id, numero: 2, valorCentavos: 400000, dataVencimento: new Date("2026-11-25"), status: "PENDENTE" },
        { projetoId: projeto.id, numero: 3, valorCentavos: 400000, dataVencimento: new Date("2026-12-25"), status: "PENDENTE" },
      ],
    });
    console.log("  ok   3 parcelas (4000,00 cada, mensais)");
  }

  // ── 7. Projeto 2 (ERP, atrasado) — com lead da Clínica ─────────────
  const leadClinica =
    (await prisma.lead.findFirst({ where: { telefoneNorm: "16988759403" } })) ??
    (await prisma.lead.create({
      data: {
        nome: "Clínica Sorriso",
        razaoSocial: "Clínica Sorriso Saudável Ltda",
        cnpj: "98765432000110", // somente dígitos
        cnpjNorm: "98765432000110",
        telefone: "16988759403",
        telefoneNorm: "16988759403",
        emails: JSON.stringify(["contato@clinicasorriso.com.br"]),
        cidade: "Ribeirão Preto",
        uf: "SP",
        origem: "INDICACAO",
        etapaFunil: "PROPOSTA",
        temWhatsapp: true,
      },
    }));

  // ── 8. Lead 3: Open Knowledge Brasil (exemplo de enriquecido) ───────
  const openKnowledge =
    (await prisma.lead.findFirst({ where: { cnpjNorm: "19131243000197" } })) ??
    (await prisma.lead.create({
      data: {
        nome: "Open Knowledge Brasil",
        razaoSocial: "OPEN KNOWLEDGE BRASIL",
        cnpj: "19131243000197", // somente dígitos
        cnpjNorm: "19131243000197",
        emails: JSON.stringify(["contato@ok.org.br"]),
        cidade: "SAO PAULO",
        uf: "SP",
        origem: "CSV",
        etapaFunil: "NOVO",
        temWhatsapp: false,
        // enriquecimento BrasilAPI (CNPJ 19.131.243/0001-97)
        nomeFantasia: "REDE PELO CONHECIMENTO LIVRE",
        identificadorMatrizFilial: 1,
        descricaoMatrizFilial: "MATRIZ",
        situacaoCadastral: 2,
        descricaoSituacaoCadastral: "ATIVA",
        dataSituacaoCadastral: new Date("2013-10-03"),
        dataInicioAtividade: new Date("2013-10-03"),
        cnaeFiscal: 9430800,
        cnaeFiscalDescricao:
          "Atividades de associações de defesa de direitos sociais",
        codigoNaturezaJuridica: 3999,
        naturezaJuridica: "Associação Privada",
        porte: "DEMAIS",
        codigoPorte: 5,
        capitalSocialCentavos: 0,
        cep: "01311902",
        logradouro: "PAULISTA 37",
        numero: "37",
        complemento: "ANDAR 4",
        bairro: "BELA VISTA",
        municipio: "SAO PAULO",
        codigoMunicipio: 7107,
        codigoMunicipioIbge: 3550308,
        dddTelefone1: "1123851939",
        opcaoPeloSimples: false,
        dataUltimaConsultaCnpj: new Date(),
        jsonCnaesSecundarios: JSON.stringify([
          { codigo: 9493600, descricao: "Atividades de organizações associativas ligadas à cultura e à arte" },
          { codigo: 9499500, descricao: "Atividades associativas não especificadas anteriormente" },
          { codigo: 8599699, descricao: "Outras atividades de ensino não especificadas anteriormente" },
          { codigo: 8230001, descricao: "Serviços de organização de feiras, congressos, exposições e festas" },
          { codigo: 6204000, descricao: "Consultoria em tecnologia da informação" },
        ]),
        jsonRegimeTributario: JSON.stringify([
          { ano: 2017, forma_de_tributacao: "ISENTA DO IRPJ", quantidade_de_escrituracoes: 1 },
          { ano: 2018, forma_de_tributacao: "ISENTA DO IRPJ", quantidade_de_escrituracoes: 1 },
          { ano: 2019, forma_de_tributacao: "ISENTA DO IRPJ", quantidade_de_escrituracoes: 1 },
          { ano: 2020, forma_de_tributacao: "ISENTA DO IRPJ", quantidade_de_escrituracoes: 1 },
          { ano: 2021, forma_de_tributacao: "ISENTA DO IRPJ", quantidade_de_escrituracoes: 1 },
          { ano: 2022, forma_de_tributacao: "ISENTA DO IRPJ", quantidade_de_escrituracoes: 1 },
          { ano: 2023, forma_de_tributacao: "ISENTA DO IRPJ", quantidade_de_escrituracoes: 1 },
        ]),
      },
    }));

  // Sócios do Open Knowledge Brasil (QSA da Receita)
  const sociosOpen = await prisma.socio.count({ where: { leadId: openKnowledge.id } });
  if (sociosOpen === 0) {
    await prisma.socio.create({
      data: {
        leadId: openKnowledge.id,
        identificadorDeSocio: 2,
        nomeSocio: "HAYDEE SVAB",
        cnpjCpfDoSocio: "***112108**",
        qualificacaoSocio: "Presidente",
        codigoQualificacaoSocio: 16,
        dataEntradaSociedade: new Date("2024-02-27"),
        faixaEtaria: "Entre 41 a 50 anos",
        codigoFaixaEtaria: 5,
        ordem: 0,
      },
    });
    console.log("  ok   Open Knowledge Brasil + 1 sócio (HAYDEE SVAB)");
  }
  const proj2Existente = await prisma.projeto.findFirst({
    where: { leadId: leadClinica.id },
  });
  if (!proj2Existente) {
    const proj2 = await prisma.projeto.create({
      data: {
        leadId: leadClinica.id,
        nome: "ERP Odontológico com Certificação",
        descricao: "Sistema de gestão para clínica com prontuário eletrônico.",
        estado: "EM_DESENVOLVIMENTO",
        progresso: 40,
        dataInicio: new Date("2026-09-01"),
        dataEntregaPrevista: new Date("2026-11-15"),
        valorTotalCentavos: 2500000,
        statusPagamento: "PENDENTE",
        interrompidoPorFaltaDePagamento: true,
      },
    });
    await prisma.parcela.create({
      data: {
        projetoId: proj2.id,
        numero: 1,
        valorCentavos: 650000,
        dataVencimento: new Date("2026-09-28"),
        status: "PENDENTE",
        observacoes: "Cliente atrasou pagamento da entrada.",
      },
    });
    console.log("  ok   Projeto 2 (ERP, atrasado) + 1 parcela");
  }

  console.log("\n✓ Seed completo.");
  console.log("  Login: kingdevtec@gmail.com / @Lexandre230188\n");
}

main()
  .catch((e) => {
    console.error("\n✗ Seed falhou:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
