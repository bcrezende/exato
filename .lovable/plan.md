

## Dashboard Especializado para Gerente

### Resumo

Criar `ManagerDashboard.tsx` separado do `ManagerCoordinatorDashboard.tsx`, com visao focada no setor do gerente: cards de coordenadores, tabela de analistas com coordenador responsavel, KPIs do setor, e tabs especificas.

O `ManagerCoordinatorDashboard.tsx` atual passa a ser usado apenas por coordenadores.

### Arquivos a criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Dashboard/ManagerDashboard.tsx` | Dashboard completo do gerente |
| `src/components/dashboard/manager/CoordinatorCards.tsx` | Cards dos coordenadores do setor com metricas |
| `src/components/dashboard/manager/AnalystRankingTable.tsx` | Tabela ranking dos analistas com coordenador |

### Arquivos a editar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Dashboard/index.tsx` | Rotear `manager` para `ManagerDashboard` (coordenador continua em `ManagerCoordinatorDashboard`) |

### ManagerDashboard.tsx

**Data fetching**: tasks, profiles, departments, task_time_logs, coordinator_analysts (para mapear analista→coordenador)

**Header**: Reutiliza `DashboardHeader` com roleLabel "Visao do Setor — {nome}" + `AdminPeriodToggle` para [Hoje/Ontem/Semana/Mes]

**Filtro**: Dropdown "Todos os Membros" com busca (coordenadores + analistas do setor). Setor pre-selecionado e bloqueado.

**KPIs** (4 cards): Tarefas no periodo, Em andamento, Atrasadas, Produtividade do setor (%) com cor condicional (verde <10% atraso, amarelo 10-20%, vermelho >20%)

**Secao "Seus Coordenadores"**: `CoordinatorCards` — grid horizontal de cards, cada um mostrando nome do coordenador, quantidade de analistas vinculados, % de tarefas no prazo da equipe, indicador verde/amarelo/vermelho, botao "Ver Equipe" que navega para `/team/monitoring`

**Secao "Desempenho dos Analistas"**: `AnalystRankingTable` — tabela com posicao, nome, coordenador responsavel, total tarefas, status visual (verde = 0 atrasos, amarelo = 1, vermelho = 2+)

**Tabs**: Visao Geral (KPIs + CoordinatorCards + Top 5 analistas), Coordenadores (cards detalhados), Analistas (tabela completa), Atrasos (reutiliza `DelayKpiCards`)

### CoordinatorCards

- Busca coordenadores do setor via `coordinator_analysts` + `user_roles`
- Para cada coordenador: conta analistas vinculados, calcula % tarefas concluidas no prazo
- Card com avatar, nome, badge "X analistas", Progress bar com %, botao "Ver Equipe"

### AnalystRankingTable

- Lista analistas do setor (filtrados por `department_id`)
- Cruza com `coordinator_analysts` para mostrar coluna "Coordenador"
- Colunas: #, Analista, Coordenador, Tarefas, Status (indicador visual)
- Ordenavel por qualquer coluna

### Nenhuma mudanca no banco de dados

Todos os dados necessarios ja existem nas tabelas existentes.

