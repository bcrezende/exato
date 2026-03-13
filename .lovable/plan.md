

## Problema identificado: Kanban não move tarefa para "Em Andamento"

### Causa raiz

A lógica de distribuição das colunas Kanban (linhas 243-248) força **qualquer tarefa com `due_date` no passado** para a coluna "Atrasada", **mesmo que o status seja `in_progress`**:

```text
Linha 244 (overdue): status === "overdue" OR (due_date < now AND status !== "completed")
Linha 246 (in_progress): status === "in_progress" AND NOT(due_date < now)
```

Quando o funcionário clica "Iniciar", o status muda para `in_progress` no banco. Mas como o `due_date` já passou, a linha 246 exclui a tarefa da coluna "Em Andamento" e a linha 244 a captura de volta na coluna "Atrasada". Visualmente, a tarefa não se move.

Além disso, `handleStatusChange` (linha 90-94) não tem tratamento de erro — se falhar, falha silenciosamente.

### Solução

**`src/pages/Tasks.tsx`** — ajustar a lógica de filtro Kanban:

1. **Coluna "Em Andamento"**: mostrar todas as tarefas com `status === "in_progress"`, independente do `due_date`. Se o funcionário iniciou a tarefa, ela deve aparecer em "Em Andamento".

2. **Coluna "Atrasada"**: excluir tarefas com `status === "in_progress"` — se já foi iniciada, não é mais "atrasada" no sentido operacional.

3. **Adicionar tratamento de erro** ao `handleStatusChange` com toast de feedback.

Lógica corrigida:
```text
overdue:      (status === "overdue") OR (due_date < now AND status === "pending")
pending:      status === "pending" AND NOT(due_date < now)
in_progress:  status === "in_progress"
completed:    status === "completed"
```

### Arquivo alterado
- **`src/pages/Tasks.tsx`** — linhas 90-94 (error handling) e linhas 243-248 (filtro Kanban)

