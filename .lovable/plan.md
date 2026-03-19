

## Dashboard Especializado para Coordenador

### Resumo

Criar `CoordinatorDashboard.tsx` dedicado, substituindo o `ManagerCoordinatorDashboard` para coordenadores. Foco na equipe vinculada via `coordinator_analysts`, performance propria, e tabs especificas.

### Arquivos a criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Dashboard/CoordinatorDashboard.tsx` | Dashboard completo do coordenador |

### Arquivos a editar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Dashboard/index.tsx` | Rotear `coordinator` para `CoordinatorDashboard` em vez de `ManagerCoordinatorDashboard` |

### CoordinatorDashboard.tsx

**Data fetching**: tasks (filtradas por assigned_to in analistas vinculados + proprio coordenador), profiles, departments, task_time_logs, coordinator_analysts

**Header**: "Visao da Minha Equipe" + nome do coordenador + AdminPeriodToggle [Hoje/Ontem/Semana/Mes] + badge "X analistas vinculados"

**Filtros**:
- Dropdown "Todos os Analistas" (apenas vinculados, com busca)
- Checkbox "Incluir minhas tarefas" (toggle para incluir/excluir tarefas do proprio coordenador nos KPIs e listas)
- Chips de filtros ativos com X

**KPIs** (4 cards):
- Tarefas Total (equipe + opcional coordenador)
- Minhas Tarefas (count do proprio coordenador)
- Atrasadas da Equipe
- Produtividade da Equipe (%) com cor condicional

**Secao "Seus Analistas"**: Grid de cards (reutiliza padrao do TeamMonitoring). Cada card mostra nome, indicador de atividade (verde=in_progress, amarelo=pendentes, cinza=sem tarefas), contadores (em execucao, atrasadas, pendentes), botao "Ver Detalhes" → navega para `/team/monitoring/:userId`

**Secao "Minha Performance"**: Card com progress bar das tarefas do coordenador, contadores concluidas/em andamento/atrasadas

**Tabs**:
- Visao Geral: KPIs + Cards Analistas + Minha Performance + TodayProgress/CriticalTasks
- Meus Analistas: cards detalhados dos analistas
- Minhas Tarefas: lista das tarefas do proprio coordenador com status/prioridade
- Atrasos: reutiliza DelayKpiCards filtrado pelos analistas vinculados

### Logica de dados

- Busca `coordinator_analysts` onde `coordinator_id = user.id` para obter IDs dos analistas
- Tasks filtradas: `assigned_to IN (analistas_ids)` + opcionalmente `assigned_to = user.id` (quando checkbox ativo)
- Profiles filtrados: apenas os analistas vinculados
- Indicador de atividade: mesmo padrao do TeamMonitoring (in_progress=ativo, pendentes=idle, sem tarefas=inativo)

### Sem mudancas no banco

Todos os dados necessarios ja existem.

