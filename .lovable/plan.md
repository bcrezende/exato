

## Plano: Diferenciar Dashboard de /tasks

### Problema
O Dashboard possui views de Kanban e Calendário que duplicam `/tasks`. As duas páginas ficaram praticamente iguais.

### Solução
Remover Kanban e Calendário do Dashboard, mantendo-o como **painel de monitoramento puro**.

### Alteração — `src/pages/Dashboard.tsx`

**Remover:**
- Botões "Kanban" e "Calendário" do header (linhas 162-169)
- Estado `showFullView` (linha 29)
- Todo o bloco Kanban Full View (linhas 346-381)
- Todo o bloco Calendar Full View (linhas 384-fim)
- Variáveis auxiliares do calendário (`calendarMonth`, `calendarYear`, `daysInMonth`, etc. — linhas 123-135)
- `kanbanColumns` (linha 137)
- Condicional `showFullView === null` que envolve as seções (linhas 218, 343) — as seções de monitoramento ficam sempre visíveis

**Manter intacto:**
- Cards de estatísticas do dia (Tarefas Hoje, Em Andamento, Concluídas, Atrasadas)
- Seção "Atenção Imediata" (tarefas atrasadas)
- Seção "Tarefas de Hoje" com progresso e agrupamento por status
- Seção "Próximos Dias"
- Filtro de setor (dropdown)

**Resultado:** Dashboard = visão executiva de monitoramento. `/tasks` = gestão operacional com Kanban, lista, calendário e filtros.

