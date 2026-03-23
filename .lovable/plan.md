

## Ajustar Dashboards do Manager e Coordinator igual ao Admin

### O que falta em ambos

Comparando com o Admin, os dashboards do Manager e Coordinator não possuem:

1. **Overview Cards** (6 cards clicáveis: Total, No Prazo, Em Andamento, Início Atrasado, Conclusão Atrasada, Não Concluídas)
2. **Tabela drill-down** na aba "Visão Geral" ao clicar nos cards
3. **Fetch de `task_delays`** necessário para calcular início/conclusão atrasada
4. **Botão Editar funcional** no modal de tarefa (ambos têm `onEdit={() => {}}`)

### Mudanças por arquivo

| Arquivo | Mudanças |
|---|---|
| `src/pages/Dashboard/ManagerDashboard.tsx` | 1) Importar `AdminOverviewCards`, `TaskForm`, `Table` components. 2) Adicionar states: `delays`, `overviewFilter`, `editingTask`. 3) Fetch `task_delays` junto com os outros dados. 4) Calcular `periodDelays`, `periodEndISO`, `drillDownTasks`. 5) Renderizar `AdminOverviewCards` entre os KPIs e as Tabs. 6) Na aba "Visão Geral", mostrar tabela drill-down quando `overviewFilter` ativo (antes do conteúdo existente). 7) Implementar `onEdit` real + `TaskForm`. |
| `src/pages/Dashboard/CoordinatorDashboard.tsx` | Mesmas mudanças: 1) Importar `AdminOverviewCards`, `TaskForm`, `Table` components. 2) States: `delays`, `overviewFilter`, `editingTask`. 3) Fetch `task_delays`. 4) Calcular `periodDelays`, `periodEndISO`, `drillDownTasks`. 5) `AdminOverviewCards` entre KPIs e Tabs. 6) Drill-down table na "Visão Geral". 7) `onEdit` real + `TaskForm`. Adicionar aba "Analytics" que o coordinator não tem. |

### Detalhes técnicos

- Reutilizar `AdminOverviewCards` existente (aceita `periodTasks`, `periodDelays`, `periodEndISO`)
- Fetch delays: `supabase.from("task_delays").select("id, task_id, user_id, log_type, created_at")`
  - Manager: filtrar por tasks do departamento
  - Coordinator: filtrar por tasks da equipe
- `periodEndISO` calculado com `endOfDay(referenceDate).toISOString()`
- `drillDownTasks` segue a mesma lógica do Admin (switch por `overviewFilter`)
- Tabela drill-down: Título, Responsável, Início, Prazo, Status (clicável para abrir modal)
- `TaskForm` com `editing={editingTask}` e `onSaved` que refaz fetch

