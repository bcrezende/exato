

## Estimativa de Tempo + Avaliação de Dificuldade

### 1. Migração SQL

Adicionar duas colunas à tabela `tasks`:
- `estimated_minutes` (integer, nullable) — tempo estimado em minutos pelo criador
- `difficulty_rating` (smallint, nullable) — avaliação 1-5 preenchida pelo funcionário ao concluir

### 2. `src/components/tasks/TaskForm.tsx`

Adicionar campo **"Tempo estimado (minutos)"** — input numérico opcional no formulário de criação/edição. Incluir no payload de save e no `getInitialForm`.

### 3. `src/components/tasks/TaskDetailModal.tsx`

- Exibir o tempo estimado quando disponível (ex: "Estimativa: 60min")
- Quando o funcionário clicar em **"Concluir"**, abrir um mini-dialog/popover pedindo a avaliação de dificuldade (1-5 estrelas ou botões numéricos) antes de efetivamente completar a tarefa
- Salvar o `difficulty_rating` na task junto com a mudança de status

### 4. `src/lib/task-utils.ts`

Aceitar `difficulty_rating` opcional no `updateTaskStatus` e incluí-lo no update quando `newStatus === "completed"`.

### 5. `src/pages/Analysis.tsx` e Edge Function

Enviar novas métricas à IA:
- Tempo estimado vs. real (média de desvio)
- Distribuição de dificuldade (média, tarefas mais difíceis)
- Tarefas com maior desvio estimado vs. real

### 6. Visualizações existentes

- `TaskDetailModal`: mostrar estimativa ao lado do tempo real para comparação direta
- `PerformanceAnalytics`: pode usar os dados futuramente para gráficos

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| Migração SQL | `ALTER TABLE tasks ADD COLUMN estimated_minutes integer, ADD COLUMN difficulty_rating smallint` |
| `src/components/tasks/TaskForm.tsx` | Campo de estimativa de tempo |
| `src/components/tasks/TaskDetailModal.tsx` | Exibir estimativa + dialog de dificuldade ao concluir |
| `src/lib/task-utils.ts` | Aceitar e salvar `difficulty_rating` |
| `src/pages/Analysis.tsx` | Calcular e enviar métricas de estimativa e dificuldade |
| `supabase/functions/generate-analysis/index.ts` | Incluir novas métricas no prompt |

