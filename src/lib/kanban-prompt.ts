// ==========================================================================
// lead_generator — kanban-prompt.ts
// Gera um prompt para uma IA externa produzir o JSON de sprints/tasks que
// alimenta o Kanban e a estimativa de horas do orçamento.
// O formato de saída é exatamente o aceito por importarKanbanServerFn.
// ==========================================================================

export interface KanbanPromptParams {
	/** Nome do projeto (ex.: "CRM para clínicas"). */
	projetoNome?: string;
	/** Contexto/descrição do que o sistema faz (preenchido pelo usuário). */
	contexto?: string;
	/** Onde estão os arquivos/docs de referência (caminho, repo, links). */
	localizacaoArquivos?: string;
}

export function gerarPromptKanban(params: KanbanPromptParams = {}): string {
	const projetoNome = params.projetoNome?.trim() || "[NOME DO PROJETO]";
	const contexto =
		params.contexto?.trim() ||
		"[DESCREVA AQUI o que o sistema faz, principais módulos, stack e requisitos]";
	const local =
		params.localizacaoArquivos?.trim() ||
		"[INFORME aqui o caminho dos arquivos/docs de referência, repositório ou links]";

	return `Você é um tech lead sênior especialista em planejamento de software.
Sua tarefa é quebrar um projeto em SPRINTS e TAREFAS bem granulares, com estimativa de horas, e devolver APENAS um JSON válido (sem texto fora do JSON, sem crases, sem markdown).

## Projeto
Nome: ${projetoNome}

## Contexto do sistema
${contexto}

## Arquivos e documentos de referência
${local}
(Leia esses materiais antes de planejar. Baseie as tarefas no escopo real descrito neles.)

## Formato de saída (OBRIGATÓRIO)
Retorne um único objeto JSON com esta estrutura exata:

{
  "sprints": [
    {
      "nome": "string — nome da sprint (ex.: \\"Sprint 1 – Setup e Modelagem\\")",
      "tasks": [
        {
          "nome": "string — nome curto e acionável da tarefa",
          "horasEstimadas": number,
          "subtasks": ["string", "string"]
        }
      ]
    }
  ]
}

## Regras dos campos
- "sprints": array ordenado. Cada sprint agrupa tarefas de um mesmo tema/etapa (ex.: Setup, Auth, CRUD X, Integração Y, Deploy).
- "sprints[].nome": título claro da sprint. Pode numerar ("Sprint 1 – ...").
- "sprints[].tasks": array de tarefas da sprint.
- "tasks[].nome": uma ação concreta e específica (ex.: "Criar endpoint POST /auth/login com sessão"). Evite nomes genéricos como "Backend" ou "Frontend".
- "tasks[].horasEstimadas": número em HORAS (decimal). Use frações (0.15, 0.25, 0.5). NÃO use minutos nem strings.
- "tasks[].subtasks": lista de passos objetivos daquela tarefa (2 a 4 itens). Opcional, mas recomendado.

## Diretrizes de granularidade (MUITO IMPORTANTE)
- PREFIRA tarefas PEQUENAS e de POUCO TEMPO. Cada tarefa deve ter, idealmente, entre 0.15h e 0.5h.
- Se uma tarefa passar de ~0.5h, QUEBRE em tarefas menores.
- Quanto mais granular e com subtasks claras, melhor — isso dá estimativas mais precisas.
- Distribua as tarefas em sprints coerentes; não concentre tudo numa sprint só.
- Cubra o ciclo completo quando fizer sentido: setup/infra → modelagem → backend → frontend → integrações → testes → deploy.

## Exemplo de referência (apenas para formato — adapte ao projeto real)
{
  "sprints": [
    {
      "nome": "Sprint 1 – Setup, Infraestrutura e Modelagem do Banco",
      "tasks": [
        {
          "nome": "Inicializar estrutura do Monorepo (apps/api e apps/web)",
          "horasEstimadas": 0.25,
          "subtasks": [
            "Criar workspace raiz e package.json",
            "Scaffold inicial do backend em apps/api",
            "Scaffold inicial do frontend em apps/web"
          ]
        },
        {
          "nome": "Subir containers PostgreSQL e Redis via Docker Compose",
          "horasEstimadas": 0.15,
          "subtasks": [
            "Criar docker-compose.yml com postgres e redis",
            "Configurar .env e .env.example"
          ]
        }
      ]
    }
  ]
}

## Saída
Responda SOMENTE com o JSON final, começando em "{" e terminando em "}". Nada antes, nada depois.`;
}
