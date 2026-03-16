

## Permitir funcionários criarem/editarem/excluírem tarefas próprias

### Problema atual
- O botão "Nova Tarefa" e ações de editar/excluir só aparecem para admin/manager (`canManage`)
- A política RLS de INSERT exige role admin ou manager
- A política de DELETE já permite `created_by = auth.uid()`, então funciona
- A política de UPDATE já permite `assigned_to = auth.uid()`, então funciona

### Alterações necessárias

**1. Banco de dados — Nova política RLS de INSERT**

Adicionar política para permitir que funcionários insiram tarefas onde `created_by = auth.uid()` e `assigned_to = auth.uid()`:

```sql
CREATE POLICY "Employees can create own tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
  AND assigned_to = auth.uid()
  AND has_role(auth.uid(), 'employee')
);
```

**2. `src/pages/Tasks.tsx`**
- Mostrar botão "Nova Tarefa" para todos os roles (remover guard `canManage` do botão, manter apenas no "Importar Excel")
- No `TaskDetailModal`, mostrar editar/excluir quando o funcionário é o criador da tarefa

**3. `src/components/tasks/TaskDetailModal.tsx`**
- Alterar condição do footer: mostrar editar/excluir se `canManage` OU se o usuário atual é o `created_by` da tarefa
- Passar `user` do AuthContext para verificar

**4. `src/components/tasks/TaskForm.tsx`**
- Quando `role === "employee"`:
  - Auto-preencher `assigned_to` com o próprio ID do usuário (campo oculto)
  - Ocultar seletor de responsável e de setor
  - Usar `department_id` do perfil automaticamente
  - Remover validação de `department_id` para employees

### Arquivos alterados
- Migration SQL (nova política RLS)
- `src/pages/Tasks.tsx` — mostrar botão criar para employees
- `src/components/tasks/TaskDetailModal.tsx` — mostrar edit/delete para criador
- `src/components/tasks/TaskForm.tsx` — simplificar form para employees

