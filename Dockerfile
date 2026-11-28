# ==========================================================================
# Dockerfile — lead_generator (TanStack Start + Nitro + SQLite)
# Compatível com Coolify (node-server preset)
# Build: docker build -t sisten .
# Run:   docker run -p 3000:3000 -v sisten_data:/data sisten
# ==========================================================================

# --------------------------------------------------------------------------
# Estágio 1: Dependências + Build
# --------------------------------------------------------------------------
FROM node:22-alpine AS builder

# Ferramentas nativas para better-sqlite3 e outros binários nativos
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Instalar pnpm globalmente
RUN npm install -g pnpm@latest

# Copiar manifests primeiro (melhor cache de camadas)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar todas as deps (incluindo devDependencies para o build)
RUN pnpm install --frozen-lockfile

# Copiar todo o código-fonte
COPY . .

# Gerar o client Prisma a partir do schema
RUN DATABASE_URL="file:/tmp/build.db" pnpm exec prisma generate

# Build do TanStack Start → Nitro (output em .output/)
RUN DATABASE_URL="file:/tmp/build.db" pnpm run build

# --------------------------------------------------------------------------
# Estágio 2: Imagem de produção — apenas o necessário
# --------------------------------------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

# pnpm necessário para executar tsx no entrypoint
RUN npm install -g pnpm@latest

# Copiar o output do Nitro (server + public)
COPY --from=builder /app/.output .output

# Copiar schema + binários nativos do prisma para migrate/seed em runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Volume para persistir o banco SQLite.
# Ponto de montagem: /data  →  arquivo: /data/prod.db
# Coolify detecta automaticamente volumes nomeados definidos no docker-compose.yml
VOLUME ["/data"]

# Variáveis com defaults mínimos para o processo Node.js.
# Os valores reais vêm do docker-compose.yml / painel do Coolify em runtime.
ENV NODE_ENV=production
ENV PORT=3000
# Porta interna do app (dentro do container). Fixa — ver docker-entrypoint.sh.
# É ela que o healthcheck e o mapeamento de portas usam; a porta pública do
# host é outra variável (HOST_PORT).
ENV APP_PORT=3000

# Expor a porta configurada
EXPOSE 3000

# Healthcheck autocontido na imagem (o compose.yml define um equivalente).
# Usa $APP_PORT — nunca $PORT — para não ser afetado por um PORT injetado
# pelo painel do Coolify, que desalinharia o probe da porta real do app.
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${APP_PORT:-3000}/api/health || exit 1

# Entrypoint: aplica migrate + seed e sobe o servidor
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
