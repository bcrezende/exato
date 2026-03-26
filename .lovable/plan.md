

## Tornar o card "Atrasadas" clicável com drill-down para tarefas

### Problema

O card "Atrasadas Hoje" mostra o total e a divisão por setor, mas não há como o admin ver **quais** são essas tarefas. Não existe caminho de navegação — o card é estático.

### Solução

Tornar o card de atrasadas clicável. Ao clicar, o sistema ativa automaticamente a aba "Visão Geral" e filtra pelo `overviewFilter = "notCompleted"` (que já existe nos `AdminOverviewCards`), mostrando a tabela com as tarefas atrasadas. Adicionalmente, cada linha de setor no breakdown será clicável para filtrar por aquele departamento.

### Mudanças

**1. `src/components/dashboard/admin/AdminKpiCards.tsx`**

- Adicionar props: `onOverdueClick?: () => void` e `onDepartmentClick?: (deptName: string) => void`
- Tornar o card de atrasadas clicável com `cursor-pointer hover:bg-accent/50` e `onClick={onOverdueClick}`
- Cada linha de setor no breakdown: `cursor-pointer hover:bg-muted rounded px-1` com `onClick={() => onDepartmentClick(dept.name)}`

**2. `src/pages/Dashboard/AdminDashboard.tsx`**

- Passar callbacks ao `AdminKpiCards`:
  - `onOverdueClick`: seta `overviewFilter("notCompleted")` e `activeTab("geral")` — reaproveita o drill-down existente
  - `onDepartmentClick(name)`: faz o mesmo + seta `selectedDepartment` pelo nome do departamento (busca o ID em `departments`)
- Nenhuma lógica nova de filtragem — reutiliza o mecanismo de drill-down já implementado nos `AdminOverviewCards`

### Visual

```text
┌─────────────────────────┐
│ ⚠  3  ← clicável       │
│ Atrasadas Hoje          │
│ ──────────────────────  │
│ CONTAS A RECEBER  3  ←  │  cada linha clicável
└─────────────────────────┘

Ao clicar → aba "Visão Geral" abre com tabela das tarefas atrasadas
Ao clicar no setor → mesma ação + filtra por aquele departamento
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/admin/AdminKpiCards.tsx` | Props de callback + estilos clicáveis |
| `src/pages/Dashboard/AdminDashboard.tsx` | Passar callbacks que ativam drill-down existente |

