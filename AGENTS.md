# AGENTS.md — lead_generator

> Regras de organização e operação para o agente de leads.
> Objetivo: manter o projeto fácil de ler, fácil de manter por humanos
> e com responsabilidades bem separadas.

## Stack

- **TanStack Start + Router** — rotas file-based em `src/routes/`
- **TanStack Query** — toda requisição/cache de dados
- **TanStack Form + Zod** — formulários e validação
- **Tailwind CSS v4** — todo o estilo (sem Chakra ou outra lib de UI)
- **Prisma + SQLite** — banco de dados
- **Biome** — format + lint (`npm run check` antes de commitar)
- Alias de import: `#/*` e `@/*` → `./src/*`

## Estrutura de pastas

```
src/
├── routes/                    # páginas (file-based routing do TanStack Router)
├── componentes/
│   ├── ux/                    # componentes base, agnósticos
│   ├── composicao/            # componentes especializados
│   ├── orquestracao/          # forms e blocos que combinam componentes
│   └── layout/                # estrutura fixa (header, sidebar, shell)
├── lib/                       # funções puras compartilhadas (sanitize, mask, cpf)
├── api/                       # fetchers e server functions por domínio
├── hooks/                     # hooks compartilhados
└── types/                     # tipos e schemas zod compartilhados
```

## Camadas de componentes

A regra de dependência é sempre de cima para baixo — nunca o contrário:

```
página → orquestração → composição → ux
                │
                └── todos podem usar lib/, api/ (via query), hooks/ e types/
```

### ux (`componentes/ux/`)

Componentes reaproveitáveis e **agnósticos**: definem a ux base do projeto
(cor, tamanho, foco, estados). Podem ter funcionalidades básicas como máscara
e limpeza de dados, mas **nunca** regra de negócio ou chamada de API.
O ajuste fino é feito na composição via `className` e props.

### composição (`componentes/composicao/`)

Usam os componentes ux para criar componentes de especialidade.
Ex: `input_cpf` — usa `InputTxt`, aplica máscara de CPF e valida
quantidade de dígitos e dígito verificador.

### orquestração (`componentes/orquestracao/`)

Orquestram outros componentes. Ex: `form_login` — recebe `input_email`,
`input_senha` e um botão; o submit fica com o form, que valida os dados
(zod) antes de enviar. Ou `form_edicao` — recebe um JSON já validado,
distribui os valores para os componentes e, se o usuário alterar,
confirma e envia para a API.

### layout (`componentes/layout/`)

Componentes de estrutura que quase não mudam: header, sidebar,
container de página.

### páginas (`src/routes/`)

- Responsáveis por **composição e orquestração** dos componentes de
  orquestração (ex: renderizar um `form`).
- Responsáveis pelas **chamadas de API** (via `loader` da rota + query).
- Responsáveis pela **exibição** (o que aparece na tela).

## Funções em arquivos separados

Um arquivo, uma responsabilidade:

- Função pura **específica do componente** → `utils.ts` dentro da pasta
  do componente. Ex: `componentes/ux/input_txt/utils.ts` com `sanitizeTxt`.
- Função pura **reutilizável** → `lib/`. Ex: `lib/cpf.ts` (validação +
  máscara), `lib/format.ts`, `lib/query-keys.ts`.
- Fetcher de API → `api/<dominio>.ts`. Ex: `api/leads.ts` exporta
  `fetchLeads`, `createLead` — nunca `fetch` solto dentro de componente.
- Schema zod compartilhado → `types/`.

Cada componente fica em sua própria pasta com `index.tsx`:

```
componentes/composicao/input_cpf/
├── index.tsx    # componente
└── utils.ts     # máscara/validação específica (se não for global)
```

## Requisições e cache (otimização)

- **Nunca** `fetch`/`useEffect` para buscar dados dentro de componente —
  sempre TanStack Query (`useQuery`, `useMutation`).
- Query keys centralizadas em `lib/query-keys.ts`:

```ts
export const leadKeys = {
  all: ["leads"] as const,
  detail: (id: string) => ["leads", id] as const,
};
```

- **Prefetch no loader da rota** — o `queryClient` já está no contexto
  do router, usar `ensureQueryData` para a página chegar com dados
  prontos e evitar waterfall:

```ts
export const Route = createFileRoute("/leads")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: leadKeys.all,
      queryFn: fetchLeads,
    }),
  component: LeadsPage,
});
```

- Configure `staleTime` por domínio (ex: lista de leads ~30s) para
  evitar requisições repetidas.
- Mutation sempre com `onSuccess` → `queryClient.invalidateQueries`
  na key correspondente.
- Validar com **zod** nas fronteiras: resposta de API e submit de form.

## Server functions (`*.server.ts`)

O import-protection do TanStack Start bloqueia **qualquer** import de
runtime de arquivos `*.server.*` no bundle do client (rotas são
isomórficas — também entram no bundle). Padrão obrigatório:

- `lib/<dominio>.server.ts` → lógica server-only como função async pura
  (env vars, prisma, `node:fs`, fetch externo com chave). **Nunca**
  importado por rota/componente.
- `lib/<dominio>.ts` (isomórfico) → o `createServerFn` chamável pelo
  client, que faz `await import("./<dominio>.server")` **dentro do
  handler** (o handler é removido do bundle do client).
- Tipos compartilhados (input/response) ficam no módulo isomórfico,
  nunca no `.server.ts`.

```ts
// lib/csv-import.ts — bridge chamável pelo client
export const uploadLeadsCsvServerFn = createServerFn({ method: "POST" })
  .validator(uploadInputSchema)
  .handler(async ({ data }) => {
    const { uploadCsv } = await import("./csv-import.server");
    return uploadCsv(data);
  });
```

## Prisma — fluxo após mexer no schema

Depois de editar `prisma/schema.prisma`:

```bash
npm run db:push      # aplica no SQLite (dev.db)
npm run db:generate  # regera o client em src/generated/prisma
# reinicie o dev server (Ctrl+C + yarn dev) — o Vite/Nitro NÃO
# recarrega o client regerado; o processo fica com o schema antigo
# em memória e falha com "Unknown argument <campo-novo>".
```

O client é gerado em `src/generated/prisma` e importado por `src/db.ts`.
Em dev, `db.ts` não cacheia a instância em `globalThis` (ver comentário
no arquivo) — mas isso não dispensa o restart após `generate`.

## Chaves de API e integrações (banco, não `.env`)

Chaves de provedores externos (AIsa, Google Maps, Gemini, OpenRouter, SMTP)
ficam no banco, no singleton `ConfiguracaoIntegracao` (`prisma/schema.prisma`),
e são gerenciadas em `/configuracoes` → aba **Integrações**. Nunca em `.env`.

- **Leitura:** use `src/lib/integracao.server.ts` (`getIntegracaoCredenciais` +
  `resolverChave`). O banco tem precedência; `process.env` é apenas fallback de
  migração. Não leia `process.env.*_API_KEY` direto em server function nova.
- **Exposição:** as server functions em `src/api/integracao.ts` devolvem só
  `definida: boolean` + prévia mascarada. Nunca retorne a chave em claro.
- **Atualização:** `updateIntegracaoConfigServerFn` faz upsert no singleton;
  campo de segredo enviado vazio = **não alterar** a chave atual.
- **Teste:** `testarIntegracaoServerFn` faz uma chamada barata por provedor
  (AIsa, Google Maps, Gemini, OpenRouter, SMTP) antes de confiar na chave.

## Convenções de código

- Pasta em `kebab-case`/`snake_case`, componente em `PascalCase`,
  arquivo `index.tsx`.
- `import type` obrigatório para tipos (`verbatimModuleSyntax`).
- Props tipadas com interface `XProps`.
- Tailwind para todo estilo; `className` para ajuste fino na composição.
- Rodar `npm run check` (Biome) antes de commitar — tabs e aspas duplas.

## Exemplo — componente ux

``` tsx
// componentes/ux/input_txt/index.tsx

import { useEffect, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";

import { sanitizeTxt } from "./utils";

// ux base do projeto — o ajuste fino é feito via className na composição
const baseClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm uppercase " +
  "placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none " +
  "focus:ring-2 focus:ring-blue-500/20 read-only:cursor-not-allowed " +
  "read-only:bg-zinc-100 read-only:text-zinc-500";

export interface InputTxtProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value"> {
  valueContext?: string;
  readonly?: boolean;
}

export default function InputTxt({
  valueContext,
  readonly,
  className = "",
  ...props
}: InputTxtProps) {
  const [value, setValue] = useState(() => sanitizeTxt(valueContext ?? ""));

  useEffect(() => {
    setValue(sanitizeTxt(valueContext ?? ""));
  }, [valueContext]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeTxt(e.target.value);
    e.target.value = sanitized;
    setValue(sanitized);
    props.onChange?.(e);
  };

  const input = (
    <input
      {...props}
      type="text"
      value={value}
      readOnly={readonly}
      onChange={handleChange}
      className={`${baseClass} ${className}`}
    />
  );

  if (readonly) {
    return (
      <div className="group relative w-full">
        {input}
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-lg bg-orange-400 px-3 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
          Para fazer alguma alteração, solicite abrindo um chamado!
        </span>
      </div>
    );
  }

  return input;
}
```

``` ts
// componentes/ux/input_txt/utils.ts

// padrão do projeto: sem acentos, sem caracteres especiais,
// espaço único entre palavras e CAIXA ALTA
export function sanitizeTxt(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/, "")
    .toUpperCase();
}
```

## Exemplo — componente de composição

``` tsx
// componentes/composicao/input_name/index.tsx

import type { ComponentProps } from "react";
import InputTxt from "#/componentes/ux/input_txt";

export interface InputNameProps
  extends Omit<ComponentProps<typeof InputTxt>, "valueContext"> {
  valueName?: string;
}

export default function InputName({
  valueName = "",
  className = "",
  ...props
}: InputNameProps) {
  return (
    <div className="flex w-full max-w-md flex-col gap-1">
      <label className="text-xs font-semibold tracking-wide text-zinc-600">
        NOME COMPLETO
      </label>
      <InputTxt
        {...props}
        valueContext={valueName}
        placeholder="DIGITE O NOME COMPLETO"
        className={className}
      />
    </div>
  );
}
```
