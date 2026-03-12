

## Plano: Permitir iniciar tarefas atrasadas + log de atraso

### Problema
Tarefas com status `overdue` não mostram o botão "Iniciar" porque o código só verifica `status === "pending"`.

### Alterações

**1. `src/components/dashboard/MyDayView.tsx`**
- Onde mostra botão "Iniciar" para `pending`, adicionar também para `overdue`
- Incluir indicador visual de que a tarefa está atrasada

**2. `src/components/tasks/TaskDetailModal.tsx`**
- Adicionar botão "Iniciar" para tarefas com status `overdue` (além de `pending`)
- Manter o badge de "Atrasada" visível

**3. `src/lib/task-utils.ts`**
- Ao mudar status para `in_progress`, verificar se o status anterior era `overdue`
- Se sim, registrar o log com `action = 'started_late'` em vez de `'started'`
- Exibir essa informação no modal de detalhes

**4. Migração SQL**
- Atualizar o CHECK constraint da coluna `action` para aceitar `'started_late'` além de `'started'` e `'completed'`

**5. `src/components/tasks/TaskDetailModal.tsx` — exibição**
- Ao exibir tempo de execução, considerar `started_late` como equivalente a `started` para o cálculo
- Mostrar indicação "(iniciada com atraso)" quando o log for `started_late`

### Arquivos alterados
- **Migração SQL** — atualizar constraint
- **`src/lib/task-utils.ts`** — log `started_late`
- **`src/components/dashboard/MyDayView.tsx`** — botão iniciar para overdue
- **`src/components/tasks/TaskDetailModal.tsx`** — botão iniciar para overdue + exibir atraso

