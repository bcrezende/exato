

## Correção dos Bugs de Filtro por Período no AdminDashboard

### Problema Raiz

Três bugs trabalham juntos para gerar resultados incorretos:

1. **Tarefas `in_progress` sem filtro de data** — A lógica de `periodTasks` inclui TODAS as tarefas com status `in_progress`, ignorando completamente o período selecionado. Isso traz tarefas do dia 23/03 quando o filtro é "ontem" (22/03).

2. **"Não Concluídas" usa data errada** — Tanto no `AdminOverviewCards` quanto no `drillDownTasks`, o cálculo de "Não Concluídas" compara contra `new Date()` (hoje, tempo real) em vez do fim do período selecionado (`periodEndISO`).

### Correções

**Arquivo: `src/pages/Dashboard/AdminDashboard.tsx`**

- **`periodTasks`** (linha 136): Remover a condição `if (t.status === "in_progress") return true`. Tarefas in_progress só devem aparecer se suas datas (start_date ou due_date) caírem dentro do período.
- **`drillDownTasks`** (linha 190/199): Trocar `const todayISO = new Date().toISOString()` por `periodEndISO` na condição de "notCompleted".

**Arquivo: `src/components/dashboard/admin/AdminOverviewCards.tsx`**

- Adicionar prop `periodEndISO: string` ao componente
- No cálculo de `notCompleted`, trocar `todayISO` (derivado de `today`) por `periodEndISO`

### Resultado Esperado

Filtrando por "Ontem" (22/03/2026) + usuário específico:
- Só aparecem tarefas cujo `start_date` ou `due_date` caiam em 22/03
- "Não Concluídas" só conta tarefas com prazo vencido dentro do período selecionado
- Tarefas do dia 23/03 não aparecem

### Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/AdminDashboard.tsx` | Remover inclusão incondicional de `in_progress`; usar `periodEndISO` no drilldown |
| `src/components/dashboard/admin/AdminOverviewCards.tsx` | Nova prop `periodEndISO`; corrigir cálculo de não concluídas |

