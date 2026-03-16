

## Bug: Geração de tarefas recorrentes em massa ao concluir uma única tarefa

### Causa raiz

Quando um usuário conclui uma tarefa recorrente, o `updateTaskStatus` chama a Edge Function `generate-recurring-tasks` **sem nenhum filtro**. A Edge Function então itera sobre **TODOS** os parent tasks recorrentes da empresa inteira e gera nova instância para qualquer um cuja última instância esteja "completed" ou "overdue" — não apenas para a tarefa que acabou de ser concluída.

Ou seja: se o usuário tinha 5 tarefas recorrentes atrasadas/concluídas, concluir 1 gera instâncias para todas as 5.

### Correção

**1. `src/lib/task-utils.ts`** — Passar o `recurrence_parent_id` (ou o próprio `taskId` se for parent) no body da chamada à Edge Function:

```typescript
supabase.functions.invoke("generate-recurring-tasks", {
  body: { parentId: task.recurrence_parent_id || taskId }
})
```

**2. `supabase/functions/generate-recurring-tasks/index.ts`** — Quando receber `parentId` no body, processar **apenas** esse parent task. Quando chamada sem body (pelo cron job horário), continuar processando todos normalmente.

```
// Pseudo-lógica
const body = await req.json().catch(() => ({}));
const singleParentId = body?.parentId;

// Se tiver parentId, buscar apenas esse parent
// Se não, buscar todos (fluxo do cron)
```

### Arquivos alterados
- `src/lib/task-utils.ts` — enviar `parentId` no body
- `supabase/functions/generate-recurring-tasks/index.ts` — filtrar por `parentId` quando presente

