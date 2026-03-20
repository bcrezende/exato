

## Otimização de Performance do Banco de Dados

### Situação atual
A instância Cloud está no tamanho Large (máximo disponível). O projeto tem múltiplos problemas de consumo que podem ser otimizados no código:

### Problemas identificados

1. **`select("*")` em toda parte** — 146 ocorrências em 17 arquivos. Puxa todas as colunas de tabelas como `tasks` (que tem ~25+ colunas) quando muitas vezes só precisa de 3-5 campos.

2. **Queries sem limite** — Dashboards e páginas puxam **todas** as tasks da empresa sem `.limit()`. Se a empresa tem 10.000 tasks, carrega tudo.

3. **`task_time_logs` sem filtro de data** — Todos os dashboards puxam `task_time_logs` desde o início dos tempos, ordenados por `created_at`. Tabela que cresce infinitamente.

4. **Queries duplicadas** — O `handleRefresh` de cada dashboard faz `select("*")` sem filtros novamente, duplicando o carregamento.

5. **`task_delays` sem limite** — `DelayKpiCards` puxa todos os delays sem filtro.

6. **Falta de paginação** — A página Tasks carrega todas as tarefas de uma vez.

### Plano de otimização (por impacto)

#### 1. Substituir `select("*")` por colunas específicas
Todos os 17 arquivos que usam `select("*")` serão atualizados para selecionar apenas as colunas necessárias. Redução estimada de 40-60% no payload.

| Arquivo | Tabela | Colunas necessárias |
|---------|--------|-------------------|
| Dashboards (Admin, Manager, Coordinator, ManagerCoord) | `tasks` | `id, title, status, priority, due_date, start_date, assigned_to, department_id, recurrence_type, estimated_duration_minutes` |
| `Tasks.tsx` | `tasks` | Maioria das colunas (é a página completa), mas pode excluir `description` do listing |
| `MyDayView.tsx` | `tasks` | `id, title, status, priority, due_date, start_date, assigned_to, recurrence_type` |
| `NotificationBell.tsx` | `notifications` | `id, title, message, read, created_at` |
| `Analysis.tsx` | `tasks` / `task_time_logs` | Selecionar apenas métricas necessárias |

#### 2. Adicionar filtros de data nas queries
- **Dashboards**: Filtrar tasks dos últimos 90 dias (ou pelo período selecionado)
- **`task_time_logs`**: Filtrar pelo mesmo período do dashboard (não carregar logs de 2 anos atrás)
- **`task_delays`**: Filtrar por período

#### 3. Adicionar `.limit()` onde faz sentido
- Notifications: já tem `.limit(50)` — OK
- Tasks nos dashboards: limitar a 500 por query
- `task_time_logs`: limitar a 2000

#### 4. Otimizar `handleRefresh` dos dashboards
Em vez de recarregar todas as tasks, reutilizar os filtros já aplicados.

#### 5. Criar índices adicionais (migration SQL)
```sql
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON public.task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_created_at ON public.task_time_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_task_delays_created_at ON public.task_delays(created_at);
```

#### 6. Limpar dados antigos (opcional, com confirmação)
- Criar política de retenção para `task_time_logs` (ex: manter apenas últimos 6 meses)
- Arquivar tasks concluídas com mais de 1 ano

### Arquivos a editar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Dashboard/AdminDashboard.tsx` | Select específico + filtro de data |
| `src/pages/Dashboard/ManagerDashboard.tsx` | Idem |
| `src/pages/Dashboard/CoordinatorDashboard.tsx` | Idem |
| `src/pages/Dashboard/ManagerCoordinatorDashboard.tsx` | Idem |
| `src/pages/Dashboard/AnalystDashboard.tsx` | Idem |
| `src/components/dashboard/MyDayView.tsx` | Select específico |
| `src/pages/Tasks.tsx` | Select específico + paginação |
| `src/pages/Analysis.tsx` | Select específico |
| `src/pages/Team.tsx` | Select específico |
| `src/pages/TeamMonitoring.tsx` | Select específico |
| `src/pages/AnalystDetail.tsx` | Select específico |
| `src/components/dashboard/DelayKpiCards.tsx` | Filtro de data |
| `src/components/dashboard/AIAnalysisDialog.tsx` | Select específico |
| `src/components/NotificationBell.tsx` | Select específico |
| `src/components/settings/HolidaySettings.tsx` | Select específico |
| Migration SQL | Índices adicionais |

### Impacto esperado
- **Redução de 50-70%** no volume de dados transferidos do banco
- **Queries mais rápidas** com índices dedicados
- **Menos uso de RAM** na instância (menos dados em buffer)

