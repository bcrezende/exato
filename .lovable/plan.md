

## Nova Tela: "Minha Equipe" — Monitoramento de Analistas

### Decisoes de Design

- **Sem status online/offline**: nao existe sistema de heartbeat. Substituido por indicador baseado em atividade (tem tarefa `in_progress` = ativo, tem tarefas mas nenhuma em andamento = ausente, sem tarefas = inativo)
- **Sem chat/mensagem**: nao existe sistema de chat. O botao "Enviar Mensagem" sera substituido por "Cobrar" (notificacao)
- **Sem exportar PDF**: complexidade alta, fora do escopo. Mantido botao "Relatorio" que abre o dialog de analise IA existente
- **Reutilizar componentes existentes**: TaskCalendar, TaskDetailModal, TaskForm ja existem e serao reaproveitados na tela de detalhes

### Arquivos a criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/TeamMonitoring.tsx` | Tela principal — grid de cards dos analistas |
| `src/pages/AnalystDetail.tsx` | Tela de detalhes — header + tabs (Resumo/Kanban/Lista/Calendario) |

### Arquivos a editar

| Arquivo | Mudanca |
|---------|---------|
| `src/App.tsx` | Adicionar rotas `/team/monitoring` e `/team/monitoring/:userId` |
| `src/components/AppSidebar.tsx` | Adicionar link "Minha Equipe" no grupo Gestao |

### Tela Principal (`/team/monitoring`)

**TeamMonitoring.tsx**:
- Fetch: `profiles`, `tasks`, `coordinator_analysts` (se coordenador), `departments`
- Filtro por role: gerente ve analistas do setor, coordenador ve apenas vinculados
- Grid responsivo de cards (1-3 colunas)
- Cada card mostra:
  - Avatar + nome
  - Indicador de atividade (verde = tem tarefa in_progress, amarelo = tem tarefas pendentes, cinza = sem tarefas)
  - Badges: X em execucao, X atrasadas, X pendentes
  - Botao "Ver Detalhes" → navega para `/team/monitoring/:userId`
- Barra superior: busca por nome + filtro por status (Todos / Ativos / Com atraso / Sobrecarregados 5+)
- Header com contagem total de analistas

### Tela de Detalhes (`/team/monitoring/:userId`)

**AnalystDetail.tsx**:
- Header: botao voltar, avatar, nome, cargo, indicador de atividade
- KPI cards: total tarefas, em execucao, atrasadas, % concluidas (produtividade)
- Tabs com 4 visoes:
  - **Resumo**: KPIs + lista das tarefas do dia + ultimas concluidas
  - **Kanban**: colunas Pendente/Em Andamento/Concluida/Atrasada (read-only, sem drag)
  - **Lista**: tabela ordenavel com todas as tarefas do analista
  - **Calendario**: reutiliza `TaskCalendar` passando apenas tarefas do analista
- Acoes rapidas no rodape:
  - "Nova Tarefa" → abre TaskForm pre-preenchido com o analista
  - "Cobrar" → envia notificacao para o analista

### Rotas e Sidebar

**App.tsx**: 2 novas rotas dentro do layout protegido, com `allowedRoles={["admin", "manager", "coordinator"]}`

**AppSidebar.tsx**: novo item "Minha Equipe" com icone `UsersRound` no grupo Gestao, visivel para manager e coordinator

