

## Bug: Calendário Dia mostra 7 tarefas em vez de 9

### Causa Raiz

No `DayView`, a filtragem de tarefas usa apenas **uma data** para decidir se a tarefa pertence ao dia:

```typescript
const start = toDisplayDate(t.start_date) || toDisplayDate(t.due_date);
return start && isSameDay(start, currentDate);
```

Isso significa que:
- Se a tarefa tem `start_date` em **outro dia** e `due_date` no dia 24/03, ela **não aparece** (porque `start_date` tem prioridade e não bate com o dia).
- Tarefas sem `start_date` mas com `due_date` no dia 24/03 aparecem corretamente.

O `MonthView` não tem esse bug porque verifica se o dia está **entre** `start_date` e `due_date`. O `WeekView` tem o mesmo problema.

### Correção

Alterar a lógica de filtragem no `DayView` e `WeekView` para considerar ambas as datas: uma tarefa pertence ao dia se `start_date` OU `due_date` cai naquele dia, ou se o dia está entre as duas.

**Arquivo: `src/components/tasks/TaskCalendar.tsx`**

| Local | Mudança |
|---|---|
| `DayView` (linha 342-345) | Filtrar tarefas onde o dia está entre `start_date` e `due_date`, ou onde qualquer uma das duas cai no dia |
| `WeekView` (linha ~270) | Mesma correção |

### Lógica Nova

```typescript
// DayView & WeekView - filtro por dia
const dayTasks = tasks.filter(t => {
  const start = toDisplayDate(t.start_date);
  const end = toDisplayDate(t.due_date);
  if (start && end) {
    return isSameDay(start, day) || isSameDay(end, day) || 
           (day >= new Date(start.toDateString()) && day <= new Date(end.toDateString()));
  }
  if (start) return isSameDay(start, day);
  if (end) return isSameDay(end, day);
  return false;
});
```

Para posicionamento na grade horária, a tarefa usará o horário de `start_date` se disponível, senão `due_date`. Tarefas que **começam** em outro dia mas **terminam** no dia visualizado serão posicionadas a partir da hora 0.

