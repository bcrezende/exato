

## Adicionar Botão "Ontem" no Dashboard

### Abordagem

Adicionar um estado `viewDate` no `AdminManagerDashboard` que pode ser `"today"` ou `"yesterday"`. O botão "Ontem" aparece no `DashboardHeader` (oculto para analysts, que já são redirecionados ao `MyDayView`). Ao ativar, toda a lógica de filtragem por data (todayStr, overdue, etc.) usa `yesterday` em vez de `today`.

### Alterações

#### 1. `src/pages/Dashboard.tsx`
- Adicionar estado `viewDate: "today" | "yesterday"` (default: `"today"`)
- Alterar `today` e `todayStr` para serem derivados de `viewDate`:
  ```
  const referenceDate = viewDate === "yesterday" ? subDays(startOfDay(new Date()), 1) : startOfDay(new Date());
  const referenceDateStr = format(referenceDate, "yyyy-MM-dd");
  ```
- Ajustar o `useMemo` de `overdueTasks/todayTasks/upcomingTasks` para usar `referenceDateStr` em vez de `todayStr`
- Quando `viewDate === "yesterday"`, tratar tarefas como snapshot do dia anterior (não incluir `in_progress` automaticamente, apenas as com `due_date` ou `start_date` = ontem)
- Passar `viewDate` e `onViewDateChange` para `DashboardHeader`
- Passar `referenceDate` para `DelayKpiCards` e componentes que dependem da data

#### 2. `src/components/dashboard/DashboardHeader.tsx`
- Adicionar props: `viewDate: "today" | "yesterday"`, `onViewDateChange: (v: "today" | "yesterday") => void`
- Adicionar botão "Ontem" à esquerda do "Meu Dia":
  - Ícone: `ArrowLeft` + `CalendarIcon` (ou `ChevronLeft`)
  - Ativo: `variant="default"` com fundo primário sutil
  - Inativo: `variant="outline"`
- Botão "Hoje" toggle ao lado para voltar à visão atual
- Atualizar subtítulo para mostrar a data correta (ontem ou hoje)

#### 3. `src/components/dashboard/DelayKpiCards.tsx`
- Receber prop opcional `referenceDate` para calcular atrasos relativos ao dia de referência em vez de `new Date()`

### Lógica de filtragem "Ontem"
- Tarefas de ontem: `due_date` ou `start_date` com data = `yesterday`
- Atrasadas de ontem: tarefas com `due_date < yesterday_end` e status não `completed`
- KPIs recalculados com base na data de referência
- Comparativo ontem vs média 7 dias: calcular média de tarefas concluídas nos últimos 7 dias e comparar com o total de ontem

### Arquivos afetados
1. `src/pages/Dashboard.tsx` — estado `viewDate`, lógica de data
2. `src/components/dashboard/DashboardHeader.tsx` — botões Ontem/Hoje
3. `src/components/dashboard/DelayKpiCards.tsx` — prop `referenceDate`

