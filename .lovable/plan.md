

## Adicionar Overview Cards e Tabela Drill-Down ao Dashboard do Analista

### O que muda

O dashboard do analista ganhará os mesmos **6 cards clicáveis** do admin (adaptados para dados individuais) e uma **aba "Visão Geral"** com tabela drill-down, mantendo o checklist interativo existente.

### Estrutura proposta

```text
┌─ Header + PeriodToggle ─────────────────────────┐
├─ KPIs (4 cards existentes - mantidos) ──────────┤
├─ Overview Cards (6 cards clicáveis) ────────────┤
│  Total │ No Prazo │ Em Andamento │ Início      │
│        │          │              │ Atrasado    │
│  Conclusão Atrasada │ Não Concluídas            │
├─ Tabs ──────────────────────────────────────────┤
│  [Visão Geral] [Hoje] [Próximos] [Concluídas]  │
│  [Atrasadas]                                     │
│                                                  │
│  Visão Geral: tabela drill-down ao clicar card  │
│  Hoje: donut + checklist (existente)             │
└──────────────────────────────────────────────────┘
```

### Arquivos e mudanças

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/AnalystDashboard.tsx` | 1) Buscar `task_delays` do usuário para calcular início/conclusão atrasada. 2) Adicionar `AdminOverviewCards` com dados filtrados pelo analista. 3) Adicionar aba "Visão Geral" como primeira tab, com tabela drill-down (título, horário início, prazo, status). 4) Reorganizar tabs: Visão Geral → Hoje → Próximos → Concluídas → Atrasadas. |

### Detalhes técnicos

- Reutilizar o componente `AdminOverviewCards` existente (já aceita `periodTasks`, `periodDelays`, `periodEndISO`)
- Buscar delays do analista: `supabase.from("task_delays").select(...).eq("user_id", user.id)`
- Calcular `periodDelays` filtrando pelo período selecionado
- Na aba "Visão Geral", replicar a lógica de `drillDownTasks` do admin (filtrar por `overviewFilter` usando os delays)
- Tabela com colunas: Título, Início, Prazo, Status (sem coluna "Responsável" pois é sempre o próprio analista)

