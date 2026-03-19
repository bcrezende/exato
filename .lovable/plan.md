

## Aprimoramentos do Dashboard

### 1. DashboardHeader - Toggle Hoje/Ontem como Segmented Control + Badge de Data

**Arquivo:** `src/components/dashboard/DashboardHeader.tsx`

- Substituir os dois botões separados "Ontem" e "Hoje" por um segmented control usando `ToggleGroup` do shadcn
- Adicionar badge com a data formatada (ex: "19/03") ao lado do toggle
- Remover o botão "Filtros" (será movido para barra inline)
- Atualizar `roleLabel` para aceitar o nome do setor/equipe

### 2. Filtros Inline (sempre visíveis)

**Arquivo:** `src/components/dashboard/DashboardFilters.tsx` - Reescrever completamente

- Substituir o Sheet/modal por uma barra horizontal abaixo do header
- Dois `Select` inline: Setor (apenas admin) e Funcionário
- Chips de filtros ativos com botão X para remover
- Props simplificadas (remover `open`/`onOpenChange`)

**Arquivo:** `src/pages/Dashboard.tsx`
- Remover estado `filtersOpen` e `onOpenFilters`
- Remover prop `onOpenFilters` do DashboardHeader

### 3. DelayKpiCards - Porcentagem do total com cor

**Arquivo:** `src/components/dashboard/DelayKpiCards.tsx`

- Abaixo do número em cada card (Início Atrasado / Conclusão Atrasada), adicionar texto `(XX% do total)` com cor condicional:
  - Verde: <10%
  - Amarelo: 10-20%
  - Vermelho: >20%
- Cálculo: `(atrasadas / total de tarefas do período) × 100`
- Os valores `overduePct` e `periodTaskCount` já existem no componente

### 4. Tabs com Lucide Icons

**Arquivo:** `src/pages/Dashboard.tsx`

- Substituir emojis nas tabs por ícones Lucide:
  - Hoje: `Calendar`
  - Atrasadas: `AlertCircle`
  - Equipe: `Users`
  - Setores: `Building2`
  - Analytics: `BarChart3`

### 5. Role Labels Corretos

**Arquivo:** `src/pages/Dashboard.tsx`

- Atualizar lógica do `roleLabel`:
  - Admin: `"Visão Geral da Empresa"`
  - Manager: `"Visão do Setor — {departmentName}"` (buscar nome do setor do profile)
  - Coordinator: `"Visão da Minha Equipe"`

### 6. Skeleton por Seção

**Arquivo:** `src/components/skeletons/DashboardSkeleton.tsx`

- Expandir skeleton para incluir placeholders para: header + toggle, barra de filtros, TeamSummaryCard, KPIs (4 cards), RiskRadar, DelayKpiCards (2 cards), TodayProgress + CriticalTasks (2 cols), Tabs

---

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/DashboardHeader.tsx` | Editar — segmented control, badge data, remover botão filtros |
| `src/components/dashboard/DashboardFilters.tsx` | Reescrever — inline com chips |
| `src/components/dashboard/DelayKpiCards.tsx` | Editar — adicionar % do total com cor |
| `src/pages/Dashboard.tsx` | Editar — tabs com ícones, role labels, integrar filtros inline |
| `src/components/skeletons/DashboardSkeleton.tsx` | Editar — skeleton expandido |

