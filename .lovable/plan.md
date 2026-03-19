

## Aviso de Tarefas Pendentes ao Iniciar Nova Tarefa

### Abordagem

Criar um componente `PendingTasksAlert` reutilizável que intercepta o clique em "Iniciar" em todos os lugares do app (MyDayView, Tasks page, TaskDetailModal). Em vez de modificar cada `handleStatusChange` individualmente, criar um hook `usePendingTasksCheck` que encapsula a query e lógica do modal.

### 1. Novo hook: `src/hooks/usePendingTasksCheck.ts`

- Expõe função `checkBeforeStart(taskId, onProceed)`:
  - Query: busca tarefas do usuário onde `status IN ('pending', 'in_progress')` AND (`due_date < now()` OR `start_date` em dia anterior a hoje)
  - Se encontrar pendências: abre modal via estado interno
  - Se não houver: executa `onProceed()` diretamente
- Expõe o componente JSX do modal (renderizado pelo consumidor)
- Respeita configuração `dismiss_pending_warnings` do perfil

### 2. Novo componente: `src/components/tasks/PendingTasksAlert.tsx`

- Modal `max-w-lg` seguindo padrão do projeto
- Título: "Atenção: Tarefas Pendentes"
- Tabela com colunas: Título, Data Prevista, Status (badge colorido)
- Footer com dois botões:
  - `[Ver Tarefas]` — navega para `/tasks` com filtro de status pendente/atrasado
  - `[Continuar]` — fecha modal e executa a ação original de iniciar

### 3. Migração DB: adicionar coluna `dismiss_pending_warnings` na tabela `profiles`

- `ALTER TABLE profiles ADD COLUMN dismiss_pending_warnings boolean NOT NULL DEFAULT false`
- Permite ao usuário desativar os avisos nas configurações

### 4. Integrar nos 3 pontos de início de tarefa

**`src/components/dashboard/MyDayView.tsx`**:
- No `handleStatusChange`, quando `newStatus === "in_progress"`, chamar `checkBeforeStart` em vez de executar diretamente

**`src/pages/Tasks.tsx`**:
- Mesmo padrão no `handleStatusChange` do Kanban/lista

**`src/components/tasks/TaskDetailModal.tsx`**:
- Mesmo padrão no `handleStatusChange`

### 5. Configuração em `src/pages/Settings.tsx`

- Na tab "Perfil", adicionar switch "Desativar avisos de tarefas pendentes"
- Binding para `dismiss_pending_warnings` no perfil

### Arquivos afetados

1. `src/hooks/usePendingTasksCheck.ts` — novo hook
2. `src/components/tasks/PendingTasksAlert.tsx` — novo componente modal
3. `src/components/dashboard/MyDayView.tsx` — integrar check
4. `src/pages/Tasks.tsx` — integrar check
5. `src/components/tasks/TaskDetailModal.tsx` — integrar check
6. `src/pages/Settings.tsx` — switch de configuração
7. Migração DB — coluna `dismiss_pending_warnings` em profiles

### Detalhes técnicos

Query de pendências:
```sql
SELECT id, title, due_date, start_date, status 
FROM tasks 
WHERE assigned_to = :userId 
  AND status IN ('pending', 'in_progress', 'overdue')
  AND (due_date < now() OR start_date < today_start)
  AND id != :currentTaskId
ORDER BY due_date ASC
LIMIT 10
```

O hook retorna `{ checkBeforeStart, PendingAlertModal }` — o modal é renderizado como children pelo componente consumidor, mantendo a arquitetura limpa.

