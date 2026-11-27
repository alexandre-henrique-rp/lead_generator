# Tasks: Cnpj brasilapi 403 fallback

> feature: cnpj-brasilapi-403-fallback

<!--
  Como ler este arquivo (o formato é verificado por `onp-spec audit`):
  - T-xxx = tarefa (código de rastreio, único no projeto inteiro).
  - Toda tarefa referencia em `Refs:` pelo menos uma história de usuário
    (US-xxx) ou critério de aceite (AC-xxx).
  - Toda tarefa lista os arquivos que cria/altera em `Arquivos:` — capriche:
    é o que decide o que `onp-spec plano` roda em PARALELO (arquivos
    disjuntos) e o que roda em sequência.
  - Campos opcionais por tarefa, usados pelo plano de execução:
    `- Modelo: claude-sonnet-5` e `- Esforço: alto` (baixo|medio|alto|xalto|max).
  - Uma tarefa só pode virar [concluida] quando os critérios de aceite dela
    tiverem prova PASS registrada por `onp-spec verify`.
  Status: pendente | em-andamento | concluida
    (atalho: `onp-spec tarefa <feature> <T-xxx> <status>`)
-->

## T-001 — Acionar OpenCNPJ para HTTP 403 da BrasilAPI [concluida]
- Refs: US-001, AC-001
- Arquivos: src/api/cnpj.ts, src/lib/cnpj-provider.ts, src/lib/cnpj-provider.test.ts, onpspec.config.json
- Notas: Não repetir a chamada à BrasilAPI após 403; manter 404 e 429 como erros definitivos.
