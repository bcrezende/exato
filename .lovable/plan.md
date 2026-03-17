

## Permitir coordenador criar tarefas para si mesmo

### Problema
No `TaskForm.tsx`, o filtro `filteredMembers` para coordenadores retorna apenas os analistas vinculados (`coordinatorAnalystIds`). O próprio coordenador não aparece na lista de responsáveis, impedindo que ele se atribua tarefas. A política RLS do banco já permite isso (`assigned_to = auth.uid()`).

### Solução

**`src/components/tasks/TaskForm.tsx` — linha 85:**
- Alterar o filtro de coordenador para incluir o próprio usuário na lista:
  ```typescript
  if (isCoordinator) return members.filter(m => coordinatorAnalystIds.includes(m.id) || m.id === user?.id);
  ```

Nenhuma alteração de banco necessária — a RLS já contempla esse caso.

