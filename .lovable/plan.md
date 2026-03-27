

## Criar Dashboard de Monitoramento em `/dashboard`

### Contexto

A rota `/dashboard` já existe e renderiza dashboards por role (Admin, Manager, Coordinator, Analyst). O pedido é criar uma nova página de **Monitoramento** com estrutura similar ao `AuditDashboard` mas com KPIs diferentes e tabela expansiva por setor.

### Problema de conflito

A rota `/dashboard` já serve o `Dashboard/index.tsx` (role-based). Preciso entender: o Monitoramento **substitui** o dashboard atual ou coexiste? Pelo menu atual, "Monitoramento" aponta para `/dashboard`. Vou criar o MonitoringDashboard como a nova página padrão de `/dashboard`, substituindo o roteador por role existente.

### Plano

**1. Nova página `src/pages/Dashboard/MonitoringDashboard.tsx`**

Estrutura baseada no AuditDashboard com as seguintes diferenças nos KPIs:
- **Total de Tarefas**: contagem total no período
- **Iniciou em Atraso**: tarefas com delay `inicio_atrasado` em `task_delays`
- **Atrasadas**: tarefas `in_progress` com `due_date` vencido
- **Concluídas**: tarefas com status `completed`
- **Pendentes**: tarefas com status `pending`

Mesmos filtros: Período (hoje/ontem/semana/mês/custom) + Setor.
Mesma tabela expansiva por setor → usuários, com essas 5 métricas.
Mesma lógica de visibilidade por role (admin=tudo, manager=seu setor, coordinator=seus analistas).

**2. Atualizar `src/pages/Dashboard/index.tsx`**

Substituir o roteador por role pelo `MonitoringDashboard` — todos os usuários veem a mesma página de monitoramento.

**3. Sidebar já está correto**

O menu expansivo já tem "Monitoramento" apontando para `/dashboard`. Não precisa alterar.

**4. Título do navegador**

Já existe `"/dashboard": "Dashboard | Exato"` — alterar para `"Monitoramento | Exato"`.

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/MonitoringDashboard.tsx` | Nova página com 5 KPIs + tabela expansiva |
| `src/pages/Dashboard/index.tsx` | Importar e renderizar `MonitoringDashboard` para todos |
| `src/hooks/useDocumentTitle.ts` | Alterar título de `/dashboard` para "Monitoramento \| Exato" |

