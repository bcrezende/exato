

## Reestruturar Dashboard: Menu Expansivo + Tela de Auditoria

### Visão geral

Transformar o item "Dashboard" no sidebar em um grupo expansivo com dois sub-itens: **Auditoria** e **Monitoramento**. Criar a tela de Auditoria com cards de KPI e tabela expansiva por setor/usuário.

### 1. Sidebar expansivo

No `AppSidebar.tsx`, substituir o item único "Dashboard" por um grupo colapsável:

```text
Dashboard (expansível)
  ├── Auditoria     → /dashboard/audit
  └── Monitoramento → /dashboard
```

Usar `Collapsible` do shadcn para o sub-menu. O grupo fica aberto automaticamente quando a rota ativa começa com `/dashboard`. Visibilidade por role: Auditoria visível para admin, manager e coordinator.

### 2. Rota `/dashboard/audit`

No `App.tsx`, adicionar rota protegida:
```
/dashboard/audit → AuditDashboard (allowedRoles: admin, manager, coordinator)
```

### 3. Nova página `AuditDashboard.tsx`

Criar `src/pages/Dashboard/AuditDashboard.tsx` com:

**Cards de KPI (topo):**
- Total de Tarefas
- Não Executadas (status `not_done`)
- Início Atrasado (via `task_delays` com `log_type = inicio_atrasado`)
- Concluídas Atrasadas (via `task_delays` com `log_type = conclusao_atrasada`)
- Concluídas no Prazo (completed sem delays)
- Não Concluídas (pending/in_progress com due_date vencido)

**Filtros:** Período (hoje/ontem/semana/mês/customizado) + filtro de setor.

**Tabela expansiva por setor:**
- Cada setor é uma linha colapsável (usando `Collapsible`)
- Mostra total de tarefas, contagem por status
- Ao expandir, lista os usuários do setor com suas respectivas contagens
- Dados filtrados por `company_id` (RLS) e role do usuário:
  - Admin: todos os setores
  - Manager: apenas seu setor
  - Coordinator: apenas seus analistas vinculados

**Dados:** Reutiliza as mesmas queries do AdminDashboard (tasks, profiles, departments, task_delays), filtradas por período.

### 4. Título do navegador

Adicionar no `useDocumentTitle.ts`:
```
"/dashboard/audit": "Auditoria | Exato"
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/AppSidebar.tsx` | Dashboard vira grupo expansivo com Auditoria e Monitoramento |
| `src/pages/Dashboard/AuditDashboard.tsx` | Nova página de Auditoria |
| `src/App.tsx` | Adicionar rota `/dashboard/audit` |
| `src/hooks/useDocumentTitle.ts` | Adicionar título para `/dashboard/audit` |
| `src/pages/Dashboard/index.tsx` | Sem alteração (continua servindo `/dashboard`) |

