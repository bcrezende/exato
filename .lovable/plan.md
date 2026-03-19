

## Módulo Completo de Gestão para Gerentes e Coordenadores

Este é um projeto grande dividido em 3 entregas que serão implementadas de uma vez.

---

### Entrega 1: Radar de Risco + Resumo da Equipe

**Novo componente: `src/components/dashboard/RiskRadar.tsx`**
- Card com 3 indicadores automáticos calculados a partir dos dados já carregados no Dashboard:
  - **Funcionários críticos**: quem tem 3+ tarefas atrasadas (lista com nome e contagem)
  - **Tarefas paradas**: tarefas com status `in_progress` há mais de 8 horas (comparando `task_time_logs` com action "start" vs agora)
  - **Setores em risco**: departamentos com % de atraso acima da média geral
- Cada indicador é clicável e abre um modal com a lista detalhada
- Usa alertas visuais com cores (vermelho para crítico, amarelo para atenção)

**Novo componente: `src/components/dashboard/TeamSummaryCard.tsx`**
- Card compacto no topo do dashboard mostrando:
  - Total de membros da equipe (filtrado por setor/coordenação)
  - Membros com tarefas hoje
  - Membros sem tarefas atribuídas hoje
  - Carga média (tarefas/pessoa)
- Calculado a partir de `profilesList` e `todayTasks` já existentes

**Atualização: `src/components/dashboard/DashboardHeader.tsx`**
- Adicionar botões de ação rápida: "Nova Tarefa" (navega para /tasks com parâmetro para abrir form) e "Relatório" (abre dialog de análise IA existente)

---

### Entrega 2: Botão Cobrar + Escalar

**Atualização: `src/components/tasks/TaskDetailModal.tsx`**
- Adicionar seção "Ações de Gestão" visível apenas para admin/manager/coordinator:
  - **Botão "Cobrar"**: insere uma notificação na tabela `notifications` para o `assigned_to` da tarefa com tipo `task_reminder` e mensagem personalizada (ex: "Seu gerente solicitou atualização sobre: {título}")
  - **Botão "Escalar"**: visível para managers, cria notificação para todos os coordenadores do departamento da tarefa via `coordinator_analysts`
- Feedback via toast confirmando o envio

**Migração SQL**:
- Nenhuma nova tabela necessária — usa a tabela `notifications` existente com novos tipos `task_reminder` e `task_escalated`

---

### Entrega 3: Visão Comparativa do Coordenador

**Novo componente: `src/components/dashboard/SectorComparisonCard.tsx`**
- Visível apenas para admins (coordenadores são restritos ao próprio setor)
- Comparativo lado a lado de todos os setores mostrando:
  - % de tarefas no prazo
  - Total de tarefas / concluídas / atrasadas
  - Barras de progresso coloridas por performance
- Identificação automática de gargalos:
  - Setor com maior % de atraso
  - Setor com tarefas sem responsável
- Adicionado como nova aba "Setores" nas Tabs do dashboard

---

### Integração no Dashboard (`src/pages/Dashboard.tsx`)

Ordem dos elementos atualizada:
1. DashboardHeader (com botões de ação rápida)
2. TeamSummaryCard (resumo da equipe)
3. KpiCards (existente)
4. RiskRadar (novo — alertas inteligentes)
5. DelayKpiCards (existente)
6. TodayProgress + CriticalTasksList (existente)
7. Tabs: Hoje | Atrasadas | Equipe | **Setores** | Analytics

---

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/RiskRadar.tsx` | Criar |
| `src/components/dashboard/TeamSummaryCard.tsx` | Criar |
| `src/components/dashboard/SectorComparisonCard.tsx` | Criar |
| `src/components/dashboard/DashboardHeader.tsx` | Editar (ações rápidas) |
| `src/components/tasks/TaskDetailModal.tsx` | Editar (cobrar/escalar) |
| `src/pages/Dashboard.tsx` | Editar (integrar novos componentes) |

### Decisões técnicas

- **Sem tabelas novas**: tudo calculado a partir de `tasks`, `profiles`, `task_time_logs` e `notifications` existentes
- **Sem War Room por enquanto**: tela fullscreen com Kanban real-time é uma feature separada grande demais para esta entrega — a página /tasks já serve como Kanban operacional
- **Sem presença online**: requeriria sistema de heartbeat/presença que não existe; substituído por "membros com tarefas hoje"
- **Sem relatórios automáticos por email**: requer cron jobs + templates de email; pode ser adicionado depois
- **Chat por tarefa**: já existe via comentários em `task_comments` — não duplicar

