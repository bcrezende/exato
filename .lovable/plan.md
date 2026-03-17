

## Exibir badge de recorrência em tarefas geradas automaticamente

### Problema
A edge function `generate-recurring-tasks` cria instâncias com `recurrence_type: "none"` (correto, pois a instância em si nao recorre). Porém, a UI só mostra o badge "Diária" quando `recurrence_type !== "none"`, então as instâncias geradas automaticamente aparecem sem indicação visual de que pertencem a uma tarefa recorrente.

### Solução
Ajustar a lógica de exibição para considerar o `recurrence_parent_id`. Se a tarefa tem um `recurrence_parent_id`, ela é filha de uma tarefa recorrente e deve exibir o badge correspondente ao tipo do pai.

### Alterações

**`src/pages/Tasks.tsx`:**
- Na exibição do badge de recorrência (Kanban e Lista), mudar a condição de `task.recurrence_type !== "none"` para também incluir tarefas com `recurrence_parent_id !== null`
- Para tarefas filhas, buscar o `recurrence_type` do pai na lista de tasks (que já está carregada em memória)
- Criar helper `getRecurrenceLabel(task)` que retorna o label correto: usa `recurrence_type` se for do próprio task, ou busca do pai via `recurrence_parent_id`
- Ajustar o filtro de recorrência para também capturar tarefas filhas

**`src/components/tasks/TaskDetailModal.tsx`:**
- Aplicar a mesma lógica no modal de detalhes para exibir corretamente a recorrência herdada do pai

**`src/components/tasks/TaskForm.tsx`:**
- Nenhuma alteração necessária (o form já funciona corretamente)

Nenhuma alteração de banco necessária.

