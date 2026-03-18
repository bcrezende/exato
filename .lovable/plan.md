

## Reestruturação do Dashboard Gerencial

### Visão Geral
Refatorar o `Dashboard.tsx` monolítico (~385 linhas) em componentes modulares com layout limpo e hierárquico, filtros em drawer, e lazy loading para analytics.

### Novos Componentes a Criar

**1. `src/components/dashboard/DashboardHeader.tsx`**
- Título "Dashboard" + data atual + subtítulo do role
- Botão "Meu Dia" compacto (variant ghost, apenas ícone + texto pequeno)
- Botão de "Filtros" que abre um Drawer/Sheet lateral

**2. `src/components/dashboard/DashboardFilters.tsx`**
- Sheet (lateral direita) com os selects de Setor e Funcionário
- Recebe props: departments, employeeOptions, selectedDepartment, selectedEmployee, role, callbacks
- Botão "Limpar filtros" no rodapé

**3. `src/components/dashboard/KpiCards.tsx`**
- 4 cards compactos: Tarefas Hoje, Em Andamento, Concluídas, Atrasadas
- Props: todayTotal, todayInProgress, todayCompleted, overdueTasks, todayProgress

**4. `src/components/dashboard/TodayProgress.tsx`**
- Barra de progresso do dia + lista vertical compacta das tarefas de hoje
- Substitui o grid 3-colunas por lista vertical com indicadores coloridos de status (bolinha colorida + título + responsável em uma linha)

**5. `src/components/dashboard/OverdueSection.tsx`**
- Seção de atrasados que **sempre aparece** (mesmo vazia, mostra "Nenhuma tarefa atrasada" em estado zerado)
- Evita layout shift

**6. `src/components/dashboard/CriticalTasksList.tsx`**
- Lista resumida das próximas 3 tarefas mais críticas (atrasadas ou com prazo mais próximo)

**7. `src/components/dashboard/PerformanceTabs.tsx`**
- Wrapper com Tabs contendo: Ranking (PodiumCard) e Analytics (PerformanceAnalytics)
- `PerformanceAnalytics` com `React.lazy()` + `Suspense` -- só carrega quando a tab é aberta

### Alterações em Arquivos Existentes

**`src/pages/Dashboard.tsx`**
- Reduzir para ~60 linhas: data fetching + composição dos novos componentes
- Remover `TaskMiniCard` inline (move para `TodayProgress`)
- Manter a lógica de `useMemo` para filteredTasks, overdueTasks, todayTasks
- Export default continua com o check `role === "analyst"` (sem duplicação)

**`src/components/skeletons/DashboardSkeleton.tsx`**
- Ajustar para refletir o novo layout (header simples, KPIs, progress, lista)

### Layout Final (Z-pattern)

```text
┌─────────────────────────────────────────────┐
│ Dashboard          18/03/2026    [Filtros] [◎]│  ← Header limpo
├─────────────────────────────────────────────┤
│ [Hoje: 12] [Andamento: 3] [Concluídas: 5] [Atrasadas: 2] │  ← KPIs
├──────────────────────┬──────────────────────┤
│ Progresso do Dia     │ Tarefas Críticas     │  ← Camada 2
│ ████████░░ 60%       │ • Tarefa X (2d atraso)│
│                      │ • Tarefa Y (vence hoje)│
│ ○ Pendente - Task A  │ • Tarefa Z (amanhã)  │
│ ● Em Andamento - B   │                      │
│ ✓ Concluída - Task C │                      │
├──────────────────────┴──────────────────────┤
│ ⚠ Atenção Imediata (sempre visível)         │  ← Overdue fixo
├─────────────────────────────────────────────┤
│ [Ranking] [Analytics]                        │  ← Tabs lazy
└─────────────────────────────────────────────┘
```

### Arquivos Afetados
- `src/pages/Dashboard.tsx` (refatorar)
- `src/components/dashboard/DashboardHeader.tsx` (novo)
- `src/components/dashboard/DashboardFilters.tsx` (novo)
- `src/components/dashboard/KpiCards.tsx` (novo)
- `src/components/dashboard/TodayProgress.tsx` (novo)
- `src/components/dashboard/OverdueSection.tsx` (novo)
- `src/components/dashboard/CriticalTasksList.tsx` (novo)
- `src/components/dashboard/PerformanceTabs.tsx` (novo)
- `src/components/skeletons/DashboardSkeleton.tsx` (atualizar)

