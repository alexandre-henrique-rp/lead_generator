#!/bin/sh
# ==========================================================================
# docker-entrypoint.sh
# Executado pelo container ao iniciar. Ordem:
#   0. Garante que o diretório do banco SQLite existe e tem permissão
#   1. Sincroniza o schema com db push (cria/atualiza /data/prod.db)
#   2. Executa seed APENAS se o banco estiver vazio (1ª inicialização)
#   3. Sobe o servidor Nitro
# ==========================================================================
set -e

echo "▶ NODE_ENV=${NODE_ENV}"
echo "▶ DATABASE_URL=${DATABASE_URL}"

# Porta INTERNA do app. Fixa (3000) e independente da porta publicada no
# host (HOST_PORT). Fixar aqui impede que um PORT injetado pelo painel do
# Coolify desalinhe o app do mapeamento de portas do container.
APP_PORT="${APP_PORT:-3000}"
export PORT="${APP_PORT}"
echo "▶ APP_PORT=${APP_PORT} (PORT=${PORT})"

# 0. Garantir que o diretório do volume SQLite existe com permissão de escrita
#    (essencial quando o volume é montado pela 1ª vez pelo Coolify)
DB_DIR="${DB_DATA_DIR:-/data}"
echo "▶ Garantindo diretório do banco: ${DB_DIR}"
mkdir -p "${DB_DIR}"
chmod 700 "${DB_DIR}"

# 1. Schema — o projeto não usa prisma/migrations (fluxo db push, ver AGENTS.md).
#    Idempotente; sem --accept-data-loss, falha em vez de apagar dados.
echo "▶ Sincronizando schema do Prisma (db push)..."
./node_modules/.bin/prisma db push --schema=./prisma/schema.prisma

# 2. Seed — só roda se a tabela Usuario estiver vazia
echo "▶ Verificando se o seed é necessário..."
USER_COUNT=$(./node_modules/.bin/tsx -e "
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from './src/generated/prisma/client.js';
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:/data/prod.db' });
const prisma = new PrismaClient({ adapter });
const c = await prisma.usuario.count();
await prisma.\$disconnect();
console.log(c);
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
  echo "▶ Banco vazio — executando seed inicial..."
  ./node_modules/.bin/tsx prisma/seed.ts
  echo "✓ Seed completo."
else
  echo "✓ Banco já populado (${USER_COUNT} usuário(s)) — seed ignorado."
fi

# 3. Iniciar o servidor Nitro
echo "▶ Iniciando servidor na porta ${APP_PORT}..."
exec node .output/server/index.mjs
