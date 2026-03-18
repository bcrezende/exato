

## Adicionar Porcentagem de Atrasos sobre Total de Tarefas

### Alterações em `src/components/dashboard/DelayKpiCards.tsx`

**1. Calcular tarefas atrasadas e total do período**

No `useMemo` existente (linhas 73-90), adicionar:
- `periodTasks`: filtrar `tasks` cujo `created_at` (ou `start_date`/`due_date`) esteja dentro do período selecionado (`periodStart` até agora)
- `overdueNow`: tarefas com status `pending` ou `in_progress` cujo `due_date` já passou (`due_date < now()`)
- Calcular `overduePct = (overdueNow / periodTasks) × 100`

**2. Adicionar novo card ou seção resumo**

Abaixo dos 2 cards existentes (Início Atrasado / Conclusão Atrasada), adicionar uma linha resumo com:
- Texto: `{overdueCount} atrasadas / {totalCount} total = {overduePct}%`
- Cor condicional da porcentagem:
  - `text-destructive` (vermelho) se > 20%
  - `text-yellow-500` se 10-20%
  - `text-green-500` se < 10%

**3. Reatividade ao período**

Já garantida pois `periodStart` e `filteredTaskIds` são recalculados via `useMemo` quando `period` muda. Basta filtrar `tasks` pelo mesmo `periodStart`.

### Arquivo afetado
- `src/components/dashboard/DelayKpiCards.tsx`

