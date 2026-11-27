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
RUN pnpm exec prisma generate

# Build do TanStack Start → Nitro (output em .output/)
RUN pnpm run build

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
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Volume para persistir o banco SQLite.
# No Coolify: mapeie o Storage Path para /data
# Em docker run: use -v sisten_data:/data
# O arquivo do banco fica em: /data/prod.db
VOLUME ["/data"]

# ------------------------------------------------------------------
# Variáveis de ambiente — defaults de produção
# Sobrescreva no painel do Coolify em "Environment Variables"
# ------------------------------------------------------------------
ENV NODE_ENV=production
ENV PORT=3000

# Localização do banco SQLite (dentro do volume /data)
# Formato: file:<caminho-absoluto>
# NÃO altere este valor — o volume /data garante a persistência
ENV DATABASE_URL="file:/data/prod.db"

# Pasta onde o SQLite vai criar o arquivo (garantia extra)
ENV DB_DATA_DIR="/data"

ENV CNPJ_API_URL="https://brasilapi.com.br/api/cnpj/v1"

# Expor a porta configurada
EXPOSE 3000

# Entrypoint: aplica migrate + seed e sobe o servidor
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
