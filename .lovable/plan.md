

## Problema: Concluir uma tarefa muda o status da outra

### Causa raiz

Está na **Edge Function `generate-recurring-tasks`** (linhas 23-27). O **Step 1** dessa função marca como `overdue` **todas** as tarefas com `due_date` no passado que estejam com status `pending` ou `in_progress`:

```text
.lt("due_date", now.toISOString())
.in("status", ["pending", "in_progress"])   ← inclui in_progress!
```

**Fluxo do bug:**
1. Tarefa A e Tarefa B estão ambas `in_progress`, ambas com `due_date` no passado
2. Você conclui Tarefa A → `updateTaskStatus` invoca a Edge Function
3. A Edge Function executa Step 1: encontra Tarefa B (`in_progress` + `due_date` passado) e muda para `overdue`
4. `fetchTasks()` recarrega — Tarefa B aparece como "atrasada" (parece ter voltado para pendente)

### Solução

**`supabase/functions/generate-recurring-tasks/index.ts`** — alterar o Step 1 para marcar como `overdue` apenas tarefas com status `pending`, **excluindo** `in_progress`:

```typescript
// Linha 27: mudar de
.in("status", ["pending", "in_progress"])
// para
.in("status", ["pending"])
```

Se uma tarefa está `in_progress`, o funcionário já está trabalhando nela. Não faz sentido forçá-la para `overdue` automaticamente — ela deve permanecer `in_progress` até ser concluída manualmente.

### Arquivo alterado
- **`supabase/functions/generate-recurring-tasks/index.ts`** — linha 27, remover `"in_progress"` do filtro de status do Step 1

