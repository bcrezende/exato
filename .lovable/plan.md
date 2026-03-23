

## Bug: Contagem de Atrasos nos Cards vs Drill-Down

### Causa Raiz

Os cards contam **todos os delays do período** (`periodDelays`), independente de a tarefa estar em `periodTasks`. Já o drill-down filtra `periodTasks.filter(t => lateStartIds.has(t.id))`, mostrando apenas tarefas que estão no período E têm delay.

Exemplo: um delay criado em 20/03 para uma tarefa com due_date em 15/03 — o delay entra no período "Semana", mas a tarefa não.

### Correção

**Arquivo: `src/components/dashboard/admin/AdminOverviewCards.tsx`**

Filtrar os IDs de delay para contar apenas tarefas que existem em `periodTasks`:

```typescript
const periodTaskIds = new Set(periodTasks.map(t => t.id));

const lateStartTaskIds = new Set(
  periodDelays.filter(d => d.log_type === "inicio_atrasado" && periodTaskIds.has(d.task_id)).map(d => d.task_id)
);
const lateCompletionTaskIds = new Set(
  periodDelays.filter(d => d.log_type === "conclusao_atrasada" && periodTaskIds.has(d.task_id)).map(d => d.task_id)
);
```

Uma única mudança em um arquivo. Os cards passam a mostrar os mesmos números do drill-down.

