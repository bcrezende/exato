

## Painel de Auditoria (Master Admin)

### Resumo

Criar uma tabela `audit_logs` para registrar ações dos usuários (login, criação de tarefas, alterações de status, etc.) e uma página `/audit-log` acessível apenas ao Master Admin para consultar esses logs com filtros.

### Detalhes técnicos

**1. Migração SQL**

- Criar tabela `audit_logs`:
  ```sql
  CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    user_email text,
    user_name text,
    action text NOT NULL,        -- 'login', 'task_created', 'task_status_changed', 'task_deleted', etc.
    entity_type text,            -- 'task', 'profile', 'invitation', etc.
    entity_id uuid,
    metadata jsonb,              -- detalhes extras (old_status, new_status, task_title, etc.)
    ip_address text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ```
- RLS: INSERT somente `service_role`, SELECT nenhum (acesso via RPC)
- Criar índice em `created_at` e `action`
- Criar trigger `audit_task_changes()` na tabela `tasks` para registrar:
  - INSERT → `task_created`
  - UPDATE de status → `task_status_changed` (com old/new status)
  - DELETE → `task_deleted`
- Criar função RPC `get_audit_logs()` SECURITY DEFINER com filtros (período, ação, usuário) restrita a `is_master`
- Criar função RPC `get_audit_stats()` para stats agregadas (total de ações por tipo)

**2. Registro de login**

- No `AuthContext.tsx`, após login bem-sucedido, chamar `supabase.rpc('log_audit_event', { ... })` com action `'login'`
- Criar função `log_audit_event()` SECURITY DEFINER que aceita ações do usuário autenticado e insere no audit_logs

**3. Nova página `src/pages/AuditLog.tsx`**

- Layout similar ao EmailMonitor
- Stats cards: Total de ações, Logins, Tarefas criadas, Alterações de status
- Filtros: Período (24h/7d/30d/custom), tipo de ação, usuário
- Tabela paginada: Data, Usuário, Ação, Entidade, Detalhes

**4. Rota e Sidebar**

- Rota `/audit-log` em `App.tsx` dentro do layout protegido
- Item "Auditoria" na seção Master do `AppSidebar.tsx` com ícone `Shield`

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| Migração SQL | Tabela `audit_logs`, trigger, 3 funções RPC, RLS |
| `src/contexts/AuthContext.tsx` | Registrar evento de login via RPC |
| `src/pages/AuditLog.tsx` | Nova página com dashboard de auditoria |
| `src/App.tsx` | Rota `/audit-log` |
| `src/components/AppSidebar.tsx` | Item "Auditoria" na seção Master |

