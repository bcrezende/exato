

## Coordenador não consegue editar/excluir tarefas

### Problemas encontrados

**1. Frontend — `TaskDetailModal.tsx` (linha 51):**
O botão de editar/excluir só aparece quando `canManage || isCreator`. Mas `canManage` é definido como `role === "admin" || role === "manager"` — coordenadores ficam de fora. Se o coordenador não criou a tarefa, os botões simplesmente não aparecem.

**Correção:** Incluir coordenador na variável `canManage`:
```typescript
const canManage = role === "admin" || role === "manager" || role === "coordinator";
```

**2. RLS — Política de DELETE na tabela `tasks`:**
A política atual para coordenadores só permite excluir tarefas onde `assigned_to IN get_coordinator_analyst_ids(...)`. Tarefas atribuídas ao próprio coordenador não são cobertas (a função só retorna IDs de analistas). A condição `created_by = auth.uid()` cobre apenas tarefas criadas por ele.

**Correção:** Adicionar `OR (assigned_to = auth.uid())` à política de DELETE para cobrir tarefas atribuídas ao próprio coordenador, independentemente de quem criou.

### Alterações

1. **`src/components/tasks/TaskDetailModal.tsx`** — Linha 51: adicionar `|| role === "coordinator"` à variável `canManage`
2. **Migração SQL** — Recriar a política de DELETE em `tasks` para incluir `(has_role(auth.uid(), 'coordinator') AND (assigned_to IN (get_coordinator_analyst_ids(...)) OR assigned_to = auth.uid()))`

