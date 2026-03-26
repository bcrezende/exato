

## Painel de Monitoramento de Emails (Master Admin)

### Resumo

Criar uma nova página `/email-monitor` acessível apenas por usuários com `is_master = true`, com dashboard completo de monitoramento de emails: stats, filtros por período/template/status, e tabela de logs.

### Problema de acesso aos dados

A tabela `email_send_log` tem RLS restrita ao `service_role`. Para que o master admin possa consultar via frontend, criaremos uma função `SECURITY DEFINER` que retorna os dados apenas para masters.

### Detalhes técnicos

**1. Migração SQL — 2 funções RPC**

```sql
-- Stats agregadas (deduplicadas por message_id)
CREATE FUNCTION get_email_stats(_start timestamptz, _end timestamptz, _template text, _status text)
RETURNS TABLE(status text, count bigint)
SECURITY DEFINER SET search_path TO 'public'
-- Só executa se is_master(auth.uid())

-- Log paginado (deduplicado por message_id, latest status)
CREATE FUNCTION get_email_logs(_start timestamptz, _end timestamptz, _template text, _status text, _limit int, _offset int)
RETURNS TABLE(message_id text, template_name text, recipient_email text, status text, error_message text, created_at timestamptz, metadata jsonb)
SECURITY DEFINER SET search_path TO 'public'

-- Templates distintos
CREATE FUNCTION get_email_templates()
RETURNS TABLE(template_name text)
SECURITY DEFINER SET search_path TO 'public'
```

**2. Nova página `src/pages/EmailMonitor.tsx`**

- 4 stat cards: Total, Enviados, Falhas (DLQ), Suprimidos
- Filtro de período: 24h, 7d, 30d, custom
- Filtro por template (dropdown multi)
- Filtro por status (All, Sent, Failed, Suppressed)
- Tabela paginada com: Template, Destinatário, Status (badge colorido), Data, Erro
- Dados via `supabase.rpc()` nas funções criadas

**3. Rota protegida em `App.tsx`**

- Rota `/email-monitor` dentro do layout protegido
- Verificação de `is_master` no componente (redireciona se não for master)

**4. Menu na sidebar `AppSidebar.tsx`**

- Item "Monitorar Emails" visível apenas quando `profile?.is_master === true`
- Ícone: `Mail`

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| Migração SQL | 3 funções RPC SECURITY DEFINER |
| `src/pages/EmailMonitor.tsx` | Nova página com dashboard completo |
| `src/App.tsx` | Rota `/email-monitor` |
| `src/components/AppSidebar.tsx` | Item de menu condicional para master |

