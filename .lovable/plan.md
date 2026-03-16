

## Permitir Admin iniciar e concluir tarefas atribuídas a ele

### Problema
No `TaskDetailModal.tsx`, linha 164, os botões "Iniciar" e "Concluir" só aparecem quando `isAssigned && !canManage`. Como admins têm `canManage = true`, os botões nunca aparecem para eles — mesmo quando a tarefa está atribuída a eles.

### Correção
**`src/components/tasks/TaskDetailModal.tsx`** — Alterar a condição da linha 164 de:
```tsx
{isAssigned && !canManage && (
```
para:
```tsx
{isAssigned && (
```

Isso permite que qualquer usuário atribuído à tarefa (incluindo admins e gerentes) veja os botões de mudança de status. Os botões de editar/excluir no footer continuam controlados pela lógica `canManage || isCreator`, sem conflito.

### Arquivo alterado
- `src/components/tasks/TaskDetailModal.tsx` — uma linha

