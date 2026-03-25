

## Corrigir divergência de -3 horas nos dashboards

### Causa raiz

As datas são armazenadas como "fake UTC" (09:00 salvo como `09:00:00+00:00`). O sistema possui `formatStoredDate()` que lê componentes UTC corretamente. Porém, em vários locais dos dashboards, é usado `format(new Date(...), "dd/MM HH:mm")` do **date-fns**, que converte para horário local (UTC-3 no Brasil), resultando em 09:00 exibido como 06:00.

### Locais com o bug

| Arquivo | Linha(s) | Uso incorreto |
|---|---|---|
| `AnalystDashboard.tsx` | 414, 417 | `format(new Date(task.start_date), "dd/MM HH:mm")` nas tabelas |
| `AnalystDashboard.tsx` | 520 | `format(new Date(t.start_date), "EEE, dd/MM")` nos cards upcoming |
| `DelayKpiCards.tsx` | 343, 346 | `format(new Date(d.scheduled_time), "dd/MM HH:mm")` e `actual_time` |
| `PerformanceAnalytics.tsx` | 156 | `format(new Date(l.created_at), "yyyy-MM-dd")` para agrupar logs por dia |
| `PerformanceAnalytics.tsx` | 567 | `format(new Date(t.completedAt), "dd/MM/yyyy HH:mm")` na tabela de concluídas |
| `CoordinatorDashboard.tsx` | 378 | `format(new Date(task.due_date), "dd/MM")` nos cards de analista |

### Locais corretos (não precisam de mudança)

- `formatTime()` em `AnalystDashboard.tsx` e `MyDayView.tsx` — usam `getUTCHours()` ✓
- Drill-down tables nos 3 dashboards Admin/Manager/Coordinator — usam `formatStoredDate()` ✓
- `DashboardHeader.tsx` — formata `new Date()` (data atual, não do banco) ✓

### Solução

Substituir todas as chamadas `format(new Date(isoStr), ...)` que formatam datas vindas do banco por `formatStoredDate()` de `@/lib/date-utils.ts`.

| Arquivo | Mudança |
|---|---|
| `AnalystDashboard.tsx` | Linhas 414, 417: trocar por `formatStoredDate(task.start_date, "datetime")` e `formatStoredDate(task.due_date, "datetime")`. Usar formato `"short-date"` na linha 520. |
| `DelayKpiCards.tsx` | Linhas 343, 346: trocar por `formatStoredDate(d.scheduled_time, "datetime")` e `formatStoredDate(d.actual_time, "datetime")` |
| `PerformanceAnalytics.tsx` | Linha 156: usar componentes UTC para extrair a data (`new Date(l.created_at).toISOString().slice(0,10)`). Linha 567: trocar por `formatStoredDate(t.completedAt, "datetime")` |
| `CoordinatorDashboard.tsx` | Linha 378: trocar por `formatStoredDate(task.due_date, "short-date")` |

Nenhuma tabela ou migração necessária — é puramente uma correção de formatação no frontend.

