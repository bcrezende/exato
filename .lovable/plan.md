

## Confirmação antes de gerar tarefa recorrente

### Objetivo
Ao concluir uma tarefa recorrente, exibir um dialog perguntando ao usuário se deseja gerar a próxima instância. Texto contextual: "amanhã" para diária, "semana que vem" para semanal, etc.

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editado | `src/lib/task-utils.ts` — separou geração em `generateNextRecurrence()`, retorna `isRecurring` |
| Criado | `src/components/tasks/RecurrenceConfirmDialog.tsx` — dialog de confirmação |
| Editado | `src/components/tasks/TaskDetailModal.tsx` |
| Editado | `src/pages/Tasks.tsx` |
| Editado | `src/components/dashboard/MyDayView.tsx` |
| Editado | `src/pages/Dashboard/AnalystDashboard.tsx` |

### Fluxo
Concluir tarefa → Se recorrente → Dialog "Gerar próxima tarefa para amanhã?" → Confirma ou cancela
