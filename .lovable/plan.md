

## Refatoração do AdminDashboard

### 1. Atualizar `AdminPeriodToggle` — adicionar "Personalizado"

**Arquivo:** `src/components/dashboard/admin/AdminPeriodToggle.tsx`

- Adicionar `"custom"` ao type `AdminPeriod`
- Novo `ToggleGroupItem` com ícone `CalendarSearch` e label "Personalizado"

### 2. Criar `AdminOverviewCards` — 5 cards de métricas

**Novo arquivo:** `src/components/dashboard/admin/AdminOverviewCards.tsx`

Props: `periodTasks`, `periodDelays` (filtrados pelo período), `today` (Date)

Cards em grid `grid-cols-2 lg:grid-cols-5`:
- **Total de Tarefas**: `periodTasks.length`
- **Feitas no Prazo**: completed tasks que NÃO possuem delay de `inicio_atrasado` nem `conclusao_atrasada`
- **Iniciadas com Atraso**: count de delays com `log_type === 'inicio_atrasado'`
- **Concluídas com Atraso**: count de delays com `log_type === 'conclusao_atrasada'`
- **Não Concluídas**: `status !== 'completed' AND due_date < hoje`

### 3. Refatorar `AdminDashboard.tsx`

**Mudanças principais:**

- Adicionar state `customStart` e `customEnd` (Date | undefined) para período personalizado
- Quando `period === "custom"`, usar `customStart`/`customEnd` no cálculo de `periodStart`/`referenceDate`
- Mostrar dois date pickers (Popover + Calendar) condicionalmente quando `period === "custom"`
- Buscar `task_delays` no `useEffect` inicial junto com os outros dados
- Calcular `periodDelays` filtrando delays por `created_at` dentro do período

**Remover da tab Geral:**
- `TeamSummaryCard`
- `KpiCards`
- `RiskRadar`
- `TodayProgress`
- `CriticalTasksList`
- `SectorComparisonCard` (manter apenas na tab Setores)

**Substituir por:** `AdminOverviewCards` + `AdminKpiCards`

**Correção do bug de atrasadas:**
```typescript
// Antes (errado): usa nowAsFakeUTC() global
// Depois (correto): atrasada = due_date < fim_do_período AND status !== 'completed' AND due_date >= periodStart
const overdueTasks = periodTasks.filter(t =>
  t.status !== "completed" &&
  t.due_date &&
  t.due_date < periodEndISO &&
  t.due_date >= periodStartISO
);
```

**Remover imports não utilizados:** `TeamSummaryCard`, `KpiCards`, `RiskRadar`, `TodayProgress`, `CriticalTasksList`, `SectorComparisonCard`, `nowAsFakeUTC`

### 4. Layout Final

```text
[Filtros Setor/Usuário]
[Toggle: Hoje | Ontem | Semana | Mês | Personalizado]
[DatePicker Início] [DatePicker Fim]  ← só se Personalizado

[AdminKpiCards - 4 cards: Setores Ativos, Total Tarefas, Atrasadas, % Atraso]
[AdminOverviewCards - 5 cards: Total, No Prazo, Início Atrasado, Conclusão Atrasada, Não Concluídas]

[Tabs: Visão Geral | Setores | Usuários | Atrasos | Analytics]
  Visão Geral → vazio (só os cards acima)
  Setores → SectorComparisonCard + AdminSectorCards
  Usuários → AdminUserRanking
  Atrasos → DelayKpiCards
  Analytics → PerformanceAnalytics
```

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/dashboard/admin/AdminPeriodToggle.tsx` | Adicionar "custom" ao type e toggle |
| `src/components/dashboard/admin/AdminOverviewCards.tsx` | Novo componente com 5 cards |
| `src/pages/Dashboard/AdminDashboard.tsx` | Refatorar: custom period, fetch delays, remover componentes, corrigir overdue |

