# Spec: Fallback da consulta CNPJ quando a BrasilAPI retorna 403

> feature: cnpj-brasilapi-403-fallback
> status: rascunho

<!--
  Como ler este arquivo (o formato é verificado por `onp-spec audit`):
  - US-xxx = história de usuário · AC-xxx = critério de aceite
    ASM-xxx = suposição · Q-xxx = pergunta em aberto
    São códigos de rastreio: ligam a especificação às tarefas e aos testes.
  - Toda história de usuário precisa de pelo menos um critério de aceite.
  - Todo critério de aceite precisa de Dado/Quando/Então completos.
  - Os códigos são únicos no projeto inteiro (nunca reutilize um número).
  - Suposições e Perguntas em aberto são OBRIGATÓRIAS: se não há nenhuma,
    escreva "Nenhuma." — mas desconfie: quase toda feature esconde uma.
-->

## Contexto

O endpoint da BrasilAPI está retornando HTTP 403 para consultas feitas pelo
servidor. Como o fallback atual só é acionado para erros de rede e 5xx, o
enriquecimento falha mesmo com o OpenCNPJ disponível.

## Histórias

### US-001 — Consultar CNPJ mesmo quando um provedor bloqueia o servidor

Como pessoa que está enriquecendo um lead, quero que o sistema consulte o
provedor alternativo quando a BrasilAPI negar acesso ao servidor, para que eu
possa continuar o cadastro sem preencher os dados fiscais manualmente.

#### AC-001 — O cadastro usa o provedor alternativo após bloqueio da BrasilAPI

- **Dado** um CNPJ válido e a BrasilAPI respondendo HTTP 403
- **Quando** o sistema consulta os dados cadastrais
- **Então** tenta o OpenCNPJ sem repetir a chamada bloqueada e usa os dados
  alternativos quando a consulta tem sucesso

## Fora de escopo

- Alterar a política, os limites ou os cabeçalhos exigidos pela BrasilAPI.
- Fazer fallback para CNPJ inexistente (404) ou limite de requisições (429).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | O OpenCNPJ já existente no projeto é o fallback aprovado para a recusa HTTP 403 da BrasilAPI. | confirmada | O fluxo já usa OpenCNPJ como fallback para 5xx e falhas de rede. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| — | Nenhuma. | respondida | A regra existente de fallback define o provedor alternativo. |
