

## Corrigir "Atrasadas Hoje" contando tarefas cujo prazo ainda não passou

### Causa raiz

Dois pontos no `AdminDashboard.tsx` classificam tarefas como "atrasadas" comparando `due_date < periodEndISO` (23:59:59), mas deveriam comparar com o **horário atual** (`nowAsFakeUTC()`). Resultado: uma tarefa com prazo às 09:00 aparece como atrasada às 08:43.

O card "Não Concluídas" no `AdminOverviewCards` já usa `nowISO` como cutoff corretamente (linha 49). Mas o cálculo de `overdueTasks` e o drill-down "overdue" não fazem o mesmo.

### Correção

**`src/pages/Dashboard/AdminDashboard.tsx`** — 2 ajustes:

**1. `overdueTasks` (linha 141-148)** — usar `nowAsFakeUTC()` como cutoff para o período atual:
```typescript
const overdueTasks = useMemo(() => {
  const cutoff = nowAsFakeUTC() < periodEndISO ? nowAsFakeUTC() : periodEndISO;
  return periodTasks.filter(t =>
    t.status !== "completed" &&
    t.due_date &&
    t.due_date < cutoff &&
    t.due_date >= periodStartISO
  );
}, [periodTasks, periodStartISO, periodEndISO]);
```

Para períodos passados (ontem, semana passada), `nowAsFakeUTC()` > `periodEndISO`, então usa `periodEndISO` — comportamento correto. Para "hoje", usa o horário atual — tarefas com prazo futuro não são contadas.

**2. `drillDownTasks` case "overdue" (linha 211)** — mesma lógica:
```typescript
case "overdue": {
  const cutoff = nowAsFakeUTC() < cutoffISO ? nowAsFakeUTC() : cutoffISO;
  return periodTasks.filter(t =>
    t.status !== "completed" &&
    t.due_date &&
    t.due_date < cutoff &&
    t.due_date >= periodStartISO
  );
}
```

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/AdminDashboard.tsx` | Usar `nowAsFakeUTC()` como cutoff em `overdueTasks` e drill-down "overdue" |

Nenhuma migração necessária.

