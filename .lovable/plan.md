

## Plano: Dashboard "Meu Dia" para Funcionários + Ações Rápidas

### Conceito

Quando o funcionário faz login, ele é redirecionado para `/dashboard` que renderiza uma visão especial "Meu Dia" — uma lista focada das tarefas de hoje, ordenadas por horário de início, com botões de ação rápida (Iniciar / Concluir) diretamente nos cards.

Admin e Manager continuam vendo o dashboard atual.

### 1. Modificar `src/pages/Dashboard.tsx`

Adicionar renderização condicional baseada no `role`:

- **Se `role === "employee"`**: renderizar o componente `MyDayView`
- **Caso contrário**: manter o dashboard existente (Kanban/Calendário)

### 2. Criar `src/components/dashboard/MyDayView.tsx`

**Layout:**
- Header: "Meu Dia" com a data atual formatada (ex: "Quarta-feira, 11 de Março")
- Resumo rápido: cards pequenos mostrando "X pendentes", "X em andamento", "X concluídas hoje"
- Lista de tarefas do dia, filtradas por `start_date` ou `due_date` no dia atual, ordenadas por `start_date ASC`

**Card de cada tarefa:**
- Horário de início e término (ex: "09:00 - 11:00")
- Título e descrição (truncada)
- Badge de prioridade
- **Botões de ação rápida:**
  - Se `status = pending`: botão "Iniciar" (ícone Play) → muda para `in_progress`
  - Se `status = in_progress`: botão "Concluir" (ícone Check) → muda para `completed`
  - Se `status = completed`: badge verde "Concluída" (sem botão)
- Clicar no card (fora dos botões) abre o modal de detalhes existente

**Dados:**
- Query: `tasks` where `assigned_to = user.id` AND (`start_date` ou `due_date` cai no dia de hoje)
- Order by `start_date ASC NULLS LAST`

### 3. Redirecionamento pós-login

O redirect atual em `Login.tsx` já envia para `/dashboard`, que é suficiente. O `Dashboard.tsx` renderiza a visão correta baseada no role.

### Arquivos
- `src/pages/Dashboard.tsx` — condicional por role
- `src/components/dashboard/MyDayView.tsx` — novo componente

