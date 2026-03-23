

## Fix: Mostrar opção de remarcar data para todos os tipos de tarefa

### Diagnóstico

A tarefa "teste" do dia 22/03 tem `recurrence_type: "daily"`, então o modal detecta como recorrente e mostra apenas:
1. Gerar próxima ocorrência
2. Apenas marcar como não feita

A opção **"Remarcar para nova data"** só aparece para tarefas não-recorrentes. Tarefas recorrentes não têm essa opção.

### Correção

Unificar as opções no `NotDoneActionModal` para que **todos os tipos de tarefa** tenham acesso à opção de remarcar:

**Arquivo:** `src/components/tasks/NotDoneActionModal.tsx`

| Cenário | Opções |
|---|---|
| Recorrente | Gerar próxima ocorrência · Remarcar para nova data · Apenas marcar como não feita |
| Sem recorrência | Remarcar para nova data · Apenas marcar como não feita |

Remover a bifurcação `isRecurring ? (...) : (...)` e usar um único `RadioGroup` com as 3 opções, onde "Gerar próxima ocorrência" só aparece se `isRecurring`.

