

## Sistema Completo de "Tarefas Não Feitas"

### 1. Migração SQL

**1.1** Adicionar `not_done` ao enum `task_status`:
```sql
ALTER TYPE task_status ADD VALUE 'not_done';
```

**1.2** Criar tabela `task_not_done_logs` com índices e RLS:
- Colunas: `id`, `task_id` (FK tasks), `user_id` (FK profiles), `reason`, `auto_generated`, `original_due_date`, `next_action`, `created_at`
- RLS: usuários da mesma empresa podem ver (via join com tasks), inserir/atualizar próprios logs
- Admins/managers/coordinators podem ver todos da empresa

### 2. Edge Function `mark-not-done-daily`

**Arquivo:** `supabase/functions/mark-not-done-daily/index.ts`

- Busca tarefas `pending`/`in_progress` com `due_date < hoje` (por empresa, respeitando timezone)
- Atualiza status para `not_done`
- Insere log em `task_not_done_logs` com `auto_generated = true`
- CORS headers incluídos

**Config:** Adicionar `verify_jwt = false` no `supabase/config.toml`

**Cron:** SQL com `pg_cron` para executar às 23:59 diariamente

### 3. Atualizar Código Existente

**Todos os locais que referenciam status de tarefas:**

| Arquivo | Mudança |
|---|---|
| `src/pages/Tasks.tsx` | Adicionar `not_done` nos `statusLabels`, `statusColors`, kanban columns, filtros |
| `src/pages/Dashboard/AnalystDashboard.tsx` | Incluir `not_done` nos labels/badges |
| `src/pages/Dashboard/AdminDashboard.tsx` | Incluir `not_done` nos cálculos e labels |
| `src/components/tasks/TaskDetailModal.tsx` | Suportar `not_done` no badge e ações |
| `src/lib/task-utils.ts` | Adicionar função `markTaskAsNotDone` |

### 4. Novos Componentes

**4.1 `NotDoneActionModal`** — `src/components/tasks/NotDoneActionModal.tsx`

Modal que aparece ao marcar manualmente ou resolver uma tarefa `not_done`:
- Título da tarefa e data de vencimento
- Se recorrente: radio "Gerar próxima ocorrência" / "Apenas marcar"
- Se não recorrente: DatePicker para remarcar
- Campo de motivo (opcional)
- Botões Cancelar / Confirmar

**4.2 `PendingNotDoneModal`** — `src/components/tasks/PendingNotDoneModal.tsx`

Modal obrigatório (não dismissível) que aparece ao entrar no app:
- Lista tarefas com status `not_done` e `next_action = 'Aguardando ação do usuário'`
- Para cada tarefa: botões "Remarcar" (abre DatePicker inline), "Concluir com atraso", ou "Gerar próxima" (se recorrente)
- Só fecha quando todas as pendências forem resolvidas

**4.3 Botão "Não feita"** — integrado nos cards/linhas de Tasks.tsx

- Visível quando `status === 'pending' || 'in_progress'` e `due_date <= hoje`
- Abre `NotDoneActionModal`

### 5. Hook `usePendingNotDone`

**Arquivo:** `src/hooks/usePendingNotDone.ts`

```typescript
interface UsePendingNotDoneReturn {
  notDoneTasks: Task[];
  isLoading: boolean;
  showModal: boolean;
  resolveTask: (taskId: string, action: 'reschedule' | 'complete_late' | 'generate_next', params?) => Promise<void>;
  refetch: () => void;
}
```

- Busca tarefas `not_done` do usuário com logs pendentes ao montar
- `resolveTask` atualiza status, log e opcionalmente reagenda ou gera recorrência

### 6. Integração no Fluxo

**`src/App.tsx` ou `src/components/AppLayout.tsx`:**
- Usar `usePendingNotDone` no layout protegido
- Renderizar `PendingNotDoneModal` quando `showModal === true`
- Modal bloqueia interação até resolver todas as pendências

### 7. Resumo de Arquivos

| Arquivo | Ação |
|---|---|
| Migration SQL | Enum `not_done` + tabela `task_not_done_logs` + RLS |
| `supabase/functions/mark-not-done-daily/index.ts` | Nova edge function |
| `supabase/config.toml` | Adicionar config da function |
| SQL insert (pg_cron) | Agendar cron job 23:59 |
| `src/lib/task-utils.ts` | Função `markTaskAsNotDone` |
| `src/hooks/usePendingNotDone.ts` | Novo hook |
| `src/components/tasks/NotDoneActionModal.tsx` | Novo modal de ação |
| `src/components/tasks/PendingNotDoneModal.tsx` | Novo modal obrigatório |
| `src/pages/Tasks.tsx` | Labels, cores, botão, kanban column |
| `src/pages/Dashboard/AnalystDashboard.tsx` | Labels e stats |
| `src/pages/Dashboard/AdminDashboard.tsx` | Labels e cálculos |
| `src/components/tasks/TaskDetailModal.tsx` | Badge e ações not_done |
| `src/components/AppLayout.tsx` | Montar PendingNotDoneModal |

