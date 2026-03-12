

## Plano: Refresh automático após geração de tarefa recorrente

### Problema
A `updateTaskStatus` dispara a Edge Function com "fire and forget". Os componentes não sabem quando a nova tarefa foi criada, então a lista não atualiza.

### Solução
Mudar `updateTaskStatus` para **aguardar** o retorno da Edge Function e retornar um flag `generatedRecurring: boolean`. Cada chamador usa esse flag para fazer `fetchTasks()` após a geração.

### Alterações

**`src/lib/task-utils.ts`**
- Trocar fire-and-forget por `await` na invocação da Edge Function
- Retornar `{ generatedRecurring: true }` quando a função foi chamada

**`src/components/dashboard/MyDayView.tsx`**
- Após `updateTaskStatus`, verificar o retorno; se `generatedRecurring`, chamar `fetchTasks()` após um breve delay (~1s) para dar tempo ao DB

**`src/pages/Tasks.tsx`**
- Mesmo ajuste no `handleStatusChange` — chamar `fetchTasks()` se houve geração

**`src/components/tasks/TaskDetailModal.tsx`**
- Já chama `onRefresh()` — que é `fetchTasks` do pai. Basta garantir o delay.

### Abordagem técnica
Em vez de delay arbitrário, o `updateTaskStatus` fará `await` da Edge Function. Quando ela retornar, o chamador sabe que a nova tarefa já existe no banco e pode fazer fetch seguro.

