import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client.js";

// `file:./...` é relativo ao CWD do processo — se o servidor subir de outro
// diretório, o SQLite cria um banco vazio lá (o banco "some"). Resolvemos
// sempre relativo à raiz do projeto (src/..) para o caminho ser estável.
const envUrl = process.env.DATABASE_URL || "file:./dev.db";
const url = envUrl.startsWith("file:./")
	? new URL(`../${envUrl.slice("file:./".length)}`, import.meta.url).href
	: envUrl;

const adapter = new PrismaBetterSqlite3({ url });

declare global {
	var __prisma: PrismaClient | undefined;
}

// Em dev, cachear no globalThis faz o HMR reutilizar um client criado com o
// schema antigo (Unknown argument após `prisma generate`). SQLite tolera
// múltiplos clients, então só reutilizamos a instância em produção.
export const prisma =
	process.env.NODE_ENV === "production"
		? globalThis.__prisma || new PrismaClient({ adapter })
		: new PrismaClient({ adapter });

if (process.env.NODE_ENV === "production") {
	globalThis.__prisma = prisma;
}
