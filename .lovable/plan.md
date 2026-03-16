

## Problema identificado

Na lógica de categorização do Dashboard (linhas 83-98), há dois bugs:

1. **Tarefas "em andamento" com prazo vencido são tratadas como atrasadas**: A linha 85 verifica `t.due_date < new Date().toISOString()` sem excluir tarefas com status `in_progress`. Resultado: uma tarefa iniciada cujo prazo já passou vai para a seção "Atenção Imediata" em vez de aparecer como "Em Andamento".

2. **Tarefas "em andamento" sem data de hoje não aparecem**: Se a `start_date` e `due_date` não coincidem com o dia atual, a tarefa simplesmente não aparece em nenhuma seção — nem em "Tarefas de Hoje", nem nos "Próximos Dias".

## Correção

Alterar a lógica no `useMemo` do `Dashboard.tsx`:

- Tarefas com `status === "in_progress"` **nunca** devem ser categorizadas como atrasadas — elas já estão sendo trabalhadas
- Tarefas com `status === "in_progress"` devem **sempre** aparecer na seção "Tarefas de Hoje", independentemente das datas

### Trecho a alterar

```typescript
// Antes (bugado):
const isOverdue = t.status === "overdue" || (!isCompleted && t.due_date && t.due_date < new Date().toISOString());

// Depois (corrigido):
const isInProgress = t.status === "in_progress";
const isOverdue = !isInProgress && (t.status === "overdue" || (!isCompleted && t.due_date && t.due_date < new Date().toISOString()));

// E após o check de overdue, adicionar:
if (isInProgress) {
  todayList.push(t);
  return;
}
```

Isso garante que tarefas em andamento sempre apareçam visíveis no dashboard, na coluna correta.

