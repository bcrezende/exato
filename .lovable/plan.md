

## Dashboard Especializado para Analista

### Resumo

Substituir o `MyDayView` atual por um `AnalystDashboard.tsx` completo com filtro de periodo, grafico de produtividade (donut), checklist interativo, preview de proximas tarefas, e 4 tabs (Hoje, Proximos Dias, Concluidas, Atrasadas).

O `MyDayView` existente ja tem a logica base (fetch de tasks do usuario, status change, KPIs, confetti). O novo dashboard expande isso com periodo toggle, donut chart, tabs, e secao de proximas tarefas.

### Arquivos a criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Dashboard/AnalystDashboard.tsx` | Dashboard completo do analista com tabs e grafico |

### Arquivos a editar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Dashboard/index.tsx` | Rotear `analyst` para `AnalystDashboard` em vez de `MyDayView` |

### AnalystDashboard.tsx

**Data fetching**: tasks onde `assigned_to = user.id`, filtradas por periodo selecionado. Fetch separado para "proximas tarefas" (amanha em diante, limit 3).

**Header**: "Meu Dashboard" + nome do analista + `AdminPeriodToggle` [Hoje/Ontem/Semana/Mes]. Sem filtros de setor ou usuario.

**KPIs** (4 cards — reutiliza padrao AnimatedCounter do MyDayView):
- Tarefas no periodo
- Em andamento
- Concluidas no periodo
- Atrasadas

**Grafico de Produtividade** (donut via Recharts PieChart):
- Segmentos: concluidas (verde), em andamento (azul), pendentes (amarelo), atrasadas (vermelho)
- Centro: "X de Y concluidas"
- Usa ChartContainer do projeto

**Checklist de Tarefas (tab Hoje)**:
- Reutiliza logica do MyDayView: checkbox/botoes para Iniciar/Concluir
- Horario inicio-fim, indicador de status por cor
- Clique abre TaskDetailModal
- Confetti quando todas concluidas

**Proximas Tarefas**: Card compacto mostrando ate 3 tarefas futuras (amanha+), com titulo e data

**Tabs**:
- Hoje: KPIs + Donut + Checklist + Proximas Tarefas
- Proximos Dias: lista de tarefas dos proximos 7 dias agrupadas por dia
- Concluidas: historico de tarefas concluidas no periodo
- Atrasadas: tarefas com status overdue

### Logica de periodo

Reutiliza `AdminPeriodToggle` e calcula dateRange igual aos outros dashboards. Na tab "Hoje" sempre mostra tarefas do dia atual independente do periodo (periodo afeta KPIs e outras tabs).

### Componentes reutilizados

- `AdminPeriodToggle` — seletor de periodo
- `AnimatedCounter` — extraido inline (mesmo padrao do MyDayView)
- `TaskDetailModal` — modal de detalhes da tarefa
- `PendingTasksAlert` — alerta de tarefas pendentes antes de iniciar
- `ChartContainer`, `PieChart` do Recharts — grafico donut
- `ConfettiCanvas` — movido inline (mesmo do MyDayView)

### Sem mudancas no banco

Todos os dados ja existem. RLS garante que analista so ve suas proprias tarefas.

### Secao tecnica

- Fetch principal: `supabase.from("tasks").select("*").eq("assigned_to", user.id)` com filtros de data
- Fetch proximas: `supabase.from("tasks").select("*").eq("assigned_to", user.id).gte("start_date", tomorrowStart).order("start_date").limit(3)`
- Status update: reutiliza `updateTaskStatus` de `@/lib/task-utils`
- `usePendingTasksCheck` para validacao antes de iniciar tarefas

