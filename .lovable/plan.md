

## Drill-down nos Cards de Métricas — Tarefas por Card

### Visão Geral

Ao clicar em um dos 5 cards do `AdminOverviewCards`, a tab "Visão Geral" exibe uma tabela com as tarefas correspondentes ao card clicado.

### Implementação

**1. Estado no `AdminDashboard.tsx`**

- Novo state: `overviewFilter: "total" | "onTime" | "lateStart" | "lateCompletion" | "notCompleted" | null`
- Ao clicar num card, seta o filtro e muda `activeTab` para `"geral"`
- Passar `onCardClick` como prop para `AdminOverviewCards`

**2. Atualizar `AdminOverviewCards.tsx`**

- Aceitar nova prop `onCardClick?: (filter: string) => void` e `activeFilter?: string | null`
- Cada card recebe `onClick={() => onCardClick?.(filterKey)}`
- Card ativo ganha borda/destaque visual (`ring-2 ring-primary`)
- Cursor pointer nos cards

**3. Filtrar tarefas na tab "Visão Geral"**

Lógica de filtragem baseada no `overviewFilter`:
- `total` → todas as `periodTasks`
- `onTime` → completed sem delays (início ou conclusão)
- `lateStart` → tarefas com `inicio_atrasado` nos `periodDelays`
- `lateCompletion` → tarefas com `conclusao_atrasada` nos `periodDelays`
- `notCompleted` → `status !== 'completed'` e `due_date < hoje`

**4. Tabela de tarefas na tab "Visão Geral"**

Quando `overviewFilter` está ativo, renderizar uma tabela simples com:
- Título (clicável → abre `TaskDetailModal`)
- Responsável (nome do profile)
- Status (badge colorido)
- Prazo (data formatada)
- Prioridade

Quando nenhum card está selecionado, manter a mensagem atual.

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/admin/AdminOverviewCards.tsx` | Adicionar `onCardClick`, `activeFilter`, cursor e destaque |
| `src/pages/Dashboard/AdminDashboard.tsx` | State `overviewFilter`, lógica de filtragem, tabela na tab Geral |

