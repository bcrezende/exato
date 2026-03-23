

## Adicionar botão "Marcar como Não Feita" para analistas

### Problema

Atualmente, a única forma de marcar uma tarefa como "Não Feita" é:
1. Automaticamente pela edge function `mark-not-done-daily` (roda no fim do dia)
2. Arrastar no Kanban para a coluna "Não Feita"

Não existe um botão explícito no modal de detalhes da tarefa (`TaskDetailModal`) para o analista marcar manualmente como não feita. Para tarefas do dia 22/03 (passadas), se a edge function não rodou ou o analista quer marcar manualmente, não há como.

### Solução

Adicionar um botão "Não feita" no `TaskDetailModal` para tarefas com status `pending`, `in_progress` ou `overdue`, que abre o `NotDoneActionModal` existente para o analista escolher a ação (remarcar, gerar próxima, apenas marcar).

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/tasks/TaskDetailModal.tsx` | Importar `NotDoneActionModal`; adicionar botão "Não feita" nos status `pending`/`in_progress`/`overdue`; ao clicar, abrir o modal com as opções; chamar `markTaskAsNotDone` e fazer refresh |

### Detalhe técnico

No bloco de "Atualizar Status" do `TaskDetailModal`, após os botões existentes de Iniciar/Concluir, adicionar:

```typescript
{(localTask.status === "pending" || localTask.status === "in_progress" || localTask.status === "overdue") && (
  <Button size="sm" variant="outline" className="w-full text-orange-600" onClick={() => setShowNotDone(true)}>
    <XCircle className="mr-2 h-4 w-4" /> Não feita
  </Button>
)}
```

E renderizar o `NotDoneActionModal` já existente, que ao confirmar chama `markTaskAsNotDone` de `task-utils.ts` e faz `onRefresh()`.

