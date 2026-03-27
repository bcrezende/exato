
## Corrigir policy de INSERT em task_not_done_logs

### Problema
A policy atual só verifica `user_id = auth.uid()`, sem validar se a `task_id` pertence à empresa do usuário.

### Solução
Recriar a policy adicionando verificação de empresa via task.

### Migração SQL

```sql
DROP POLICY IF EXISTS "Users can insert own not done logs" ON public.task_not_done_logs;

CREATE POLICY "Users can insert own not done logs"
ON public.task_not_done_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_not_done_logs.task_id
      AND t.company_id = get_user_company_id(auth.uid())
  )
);
```

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| Migração SQL | Recriar INSERT policy com verificação de empresa |
