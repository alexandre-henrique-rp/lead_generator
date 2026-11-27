// ==========================================================================
// lead_generator — seed.ts  (PRODUÇÃO)
// --------------------------------------------------------------------------
// Seed mínimo para o container: cria apenas o usuário admin.
// As credenciais são lidas das variáveis de ambiente:
//   ADMIN_EMAIL   (default: admin@kingdevtec.com)
//   ADMIN_SENHA   (default: troque-em-producao)
//   ADMIN_NOME    (default: Administrador)
//
// Idempotente: usa upsert — pode rodar múltiplas vezes com segurança.
//
// ATENÇÃO: em produção, defina ADMIN_EMAIL e ADMIN_SENHA via variáveis de
// ambiente no painel do Coolify. Nunca commite senhas reais neste arquivo.
// ==========================================================================

import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashSync } from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";

const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("▶ Seed — lead_generator");
  console.log(`  DATABASE_URL = ${DATABASE_URL}`);

  // ── Credenciais do admin (via env ou defaults de desenvolvimento) ──
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@kingdevtec.com";
  const adminSenha = process.env.ADMIN_SENHA ?? "troque-em-producao";
  const adminNome  = process.env.ADMIN_NOME  ?? "Administrador KingDevTec";

  if (adminSenha === "troque-em-producao" && process.env.NODE_ENV === "production") {
    console.warn(
      "\n⚠ ATENÇÃO: usando senha padrão em produção!\n" +
      "  Defina a variável ADMIN_SENHA no painel do Coolify.\n"
    );
  }

  // Gera o hash da senha em runtime (não hard-coded)
  const senhaHash = hashSync(adminSenha, 12);

  // ── Upsert do usuário admin ──────────────────────────────────────────
  const admin = await prisma.usuario.upsert({
    where:  { email: adminEmail },
    update: { nome: adminNome, senhaHash, isActive: true },
    create: {
      nome:      adminNome,
      email:     adminEmail,
      senhaHash,
      isActive:  true,
    },
  });

  console.log(`\n✓ Seed completo.`);
  console.log(`  Usuário admin: ${admin.email} (id=${admin.id})`);
  console.log(`  Login em: https://kingdevtec.com/login\n`);
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
