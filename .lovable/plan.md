

## Refatoracao: Dashboard Especializado para Admin

### Estrutura de arquivos

```text
src/pages/Dashboard/
├── index.tsx                    # Roteador por role (existente Dashboard export)
├── AdminDashboard.tsx           # Nova visao estrategica admin
├── ManagerCoordinatorDashboard.tsx  # Extrai AdminManagerDashboard atual
```

O `Dashboard.tsx` atual sera movido para a pasta `Dashboard/`. A logica existente do `AdminManagerDashboard` sera preservada em `ManagerCoordinatorDashboard.tsx` para manager e coordinator. O novo `AdminDashboard.tsx` tera visao estrategica exclusiva.

### Novos componentes admin

```text
src/components/dashboard/admin/
├── AdminPeriodToggle.tsx        # [Hoje] [Ontem] [Semana] [Mes]
├── AdminKpiCards.tsx            # KPIs estrategicos (setores ativos, total tarefas, atrasadas, % atraso)
├── AdminSectorCards.tsx         # Grid de cards com metricas por setor
├── AdminUserRanking.tsx         # Tabela ranking de todos os usuarios
```

### index.tsx (roteador)

- analyst → MyDayView
- admin → AdminDashboard
- manager/coordinator → ManagerCoordinatorDashboard

### AdminDashboard.tsx

**Data fetching**: tasks, profiles, departments, time_logs, task_delays (mesma query existente)

**Header**: titulo "Visao Geral da Empresa" + AdminPeriodToggle

**Filtros**: 
- Dropdown "Todos os Setores" (com busca via Input dentro do SelectContent)
- Dropdown "Todos os Usuarios" (com busca)
- Chips de filtros ativos com X

**KPIs (AdminKpiCards)**: 
- Total de setores ativos (departments com pelo menos 1 tarefa)
- Total de tarefas no periodo
- Tarefas atrasadas hoje
- % de atraso medio com cor (verde <10%, amarelo 10-20%, vermelho >20%)

**Tabs**:
- Visao Geral: TeamSummaryCard + KpiCards existente + RiskRadar + DelayKpiCards + TodayProgress/CriticalTasks
- Setores: SectorComparisonCard existente + AdminSectorCards (grid expandido)
- Usuarios: AdminUserRanking (reutiliza logica do PodiumCard mas como tabela completa)
- Atrasos: DelayKpiCards expandido com tabela de logs de inicio/conclusao atrasados
- Analytics: PerformanceAnalytics existente

### AdminPeriodToggle

ToggleGroup com 4 opcoes: "today" | "yesterday" | "week" | "month". Emite o periodo selecionado. O AdminDashboard calcula referenceDate e dateRange baseado no periodo.

### AdminKpiCards

4 cards com metricas estrategicas. Cada card clicavel abre modal com detalhes. % de atraso usa a mesma logica de cores do DelayKpiCards.

### AdminSectorCards

Grid de cards (1 por setor). Cada card mostra: nome do setor, total de tarefas, concluidas, atrasadas, % no prazo com Progress bar, lista dos top 3 analistas do setor. Reutiliza logica do SectorComparisonCard.

### AdminUserRanking

Tabela completa com todos os usuarios. Colunas: posicao, nome, setor, tarefas concluidas, no prazo, atrasadas, pontuacao. Reutiliza logica de calculo do PodiumCard. Filtro por periodo integrado.

### ManagerCoordinatorDashboard.tsx

Copia exata do `AdminManagerDashboard` atual, sem mudancas. Apenas movido de arquivo.

### Arquivos impactados

| Arquivo | Acao |
|---------|------|
| `src/pages/Dashboard.tsx` | Deletar (substituido pela pasta) |
| `src/pages/Dashboard/index.tsx` | Criar — roteador por role |
| `src/pages/Dashboard/AdminDashboard.tsx` | Criar — dashboard admin completo |
| `src/pages/Dashboard/ManagerCoordinatorDashboard.tsx` | Criar — extrair AdminManagerDashboard atual |
| `src/components/dashboard/admin/AdminPeriodToggle.tsx` | Criar |
| `src/components/dashboard/admin/AdminKpiCards.tsx` | Criar |
| `src/components/dashboard/admin/AdminSectorCards.tsx` | Criar |
| `src/components/dashboard/admin/AdminUserRanking.tsx` | Criar |
| `src/App.tsx` | Nenhuma mudanca (import de Dashboard continua igual com pasta/index) |

### Nenhuma mudanca no banco de dados

Todos os dados necessarios ja existem nas tabelas `tasks`, `profiles`, `departments`, `task_time_logs` e `task_delays`.

