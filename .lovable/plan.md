

## Limpar log de "started" ao voltar para pendente

### Problema

Quando um admin/manager reverte uma tarefa de `in_progress` para `pending`, o log `"started"` (ou `"started_late"`) permanece na tabela `task_time_logs`, gerando dados inconsistentes de tempo de execução.

### Solução

Na função `updateTaskStatus` em `src/lib/task-utils.ts`, quando `previousStatus === "in_progress"` e `newStatus === "pending"`, deletar os registros de `started`/`started_late` dessa tarefa no `task_time_logs`.

### Detalhes técnicos

Adicionar ao `updateTaskStatus`, após a atualização do status:

```typescript
// Se voltou de in_progress para pending, apagar logs de start
if (previousStatus === "in_progress" && newStatus === "pending") {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (userId) {
    supabase.from("task_time_logs")
      .delete()
      .eq("task_id", taskId)
      .in("action", ["started", "started_late"])
      .then(() => {});
  }
}
```

### Limitação de RLS

A tabela `task_time_logs` atualmente **não tem policy de DELETE**. Será necessário adicionar uma policy para permitir que o usuário delete seus próprios logs, ou que admins/managers possam deletar.

**Migração SQL necessária:**
```sql
CREATE POLICY "Users can delete own time logs"
ON public.task_time_logs FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can delete time logs in company"
ON public.task_time_logs FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_time_logs.task_id
      AND t.company_id = get_user_company_id(auth.uid())
  )
);
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/lib/task-utils.ts` | Deletar logs de started/started_late ao reverter para pending |
| Migração SQL | Policies de DELETE no `task_time_logs` |

