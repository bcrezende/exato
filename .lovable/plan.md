

## Plano: Permitir gerentes excluírem tarefas do seu setor

### Problema
A política RLS de DELETE na tabela `tasks` só permite exclusão para **admins** ou o **criador da tarefa**. Gerentes com `canManage = true` veem o botão "Excluir" na UI, mas a operação falha no banco.

### Solução

Atualizar a política RLS `Admins and creators can delete tasks` para incluir gerentes do mesmo setor:

```sql
DROP POLICY "Admins and creators can delete tasks" ON public.tasks;

CREATE POLICY "Admins managers and creators can delete tasks"
ON public.tasks
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND department_id = get_user_department_id(auth.uid())
    )
  )
);
```

### Alterações
- **Migration SQL** — substituir política de DELETE para incluir gerentes do setor

