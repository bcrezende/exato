

## Alinhar regra de atraso em todos os dashboards

### Problema atual

O `AdminDashboard` usa a regra correta com dupla verificação por horário exato:
- Tarefa `pending` com `start_date` já passado → atrasada
- Tarefa não `completed` com `due_date` já passado → atrasada

Os outros 4 dashboards usam lógica antiga baseada apenas no **dia** do `due_date`, ignorando completamente atrasos por `start_date`.

### Mudanças por arquivo

**1. `src/pages/Dashboard/ManagerDashboard.tsx`**

- **`overdueTasks` (linha 158-182)**: Substituir a lógica `due_date.split("T")[0] < referenceDateStr` pela regra dual com `nowAsFakeUTC()` como cutoff:
  ```typescript
  const cutoff = nowAsFakeUTC();
  const isStartOverdue = t.status === "pending" && t.start_date && t.start_date < cutoff;
  const isDueOverdue = t.status !== "completed" && t.due_date && t.due_date < cutoff;
  ```
- **`drillDownTasks` (linha 214-229)**: Adicionar case `"overdue"` com a mesma lógica dual
- **`myOverdue` (linha 212)**: Alinhar com a mesma regra
- **`teamProductivity` (linha 215-220)**: Usar regra dual no cálculo de produtividade

**2. `src/pages/Dashboard/CoordinatorDashboard.tsx`**

- **`overdueTasks` (linha 179-202)**: Mesma substituição pela regra dual
- **`drillDownTasks` (linha 247-262)**: Adicionar case `"overdue"` com lógica dual
- **`myOverdue` (linha 212)**: Alinhar
- **`teamProductivity`**: Alinhar

**3. `src/pages/Dashboard/ManagerCoordinatorDashboard.tsx`**

- **`overdueTasks` (linha 136-175)**: Substituir pela regra dual com cutoff por horário

**4. `src/pages/Dashboard/AnalystDashboard.tsx`**

- **`stats.overdue` (linha 277)**: Trocar de `status === "overdue"` para regra dual (pending + start_date passado OU não completed + due_date passado)
- **Tab "Atrasadas" (linha 615)**: Usar mesma regra para listar tarefas
- **`todayTasks` (linha 266-270)**: Não incluir `status === "overdue"` automaticamente; usar a regra dual

### Regra unificada (para todos)

```typescript
const cutoff = nowAsFakeUTC();
const isStartOverdue = t.status === "pending" && t.start_date && t.start_date < cutoff;
const isDueOverdue = t.status !== "completed" && t.due_date && t.due_date < cutoff;
const isOverdue = isStartOverdue || isDueOverdue;
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/ManagerDashboard.tsx` | overdueTasks, drillDown, myOverdue, productivity |
| `src/pages/Dashboard/CoordinatorDashboard.tsx` | overdueTasks, drillDown, myOverdue, productivity |
| `src/pages/Dashboard/ManagerCoordinatorDashboard.tsx` | overdueTasks |
| `src/pages/Dashboard/AnalystDashboard.tsx` | stats.overdue, tab atrasadas, todayTasks |

