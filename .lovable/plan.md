

## Sistema de Notificações por Email — Plano de Implementação

### Importante: Infraestrutura existente

O projeto já possui infraestrutura de email configurada (auth-email-hook, process-email-queue, domínio notify.rezendetech.com.br). Vamos usar a infraestrutura nativa do Lovable Cloud para emails transacionais, sem necessidade de serviços terceiros como Resend ou SendGrid.

### Visão Geral

Uma única Edge Function (`check-task-notifications`) rodando via pg_cron a cada 1 minuto verifica todas as condições de notificação e enfileira emails para tarefas que atendem aos critérios. Tabelas de controle evitam envio duplicado e permitem ao usuário configurar preferências.

### Etapa 1 — Scaffolding de email transacional

Configurar a infraestrutura de emails transacionais usando as ferramentas nativas (setup_email_infra + scaffold_transactional_email). Isso cria o Edge Function `send-transactional-email` e toda a infraestrutura de fila.

### Etapa 2 — Tabelas novas (migração)

```sql
-- Controle de envio (evita duplicatas)
CREATE TABLE task_email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'reminder_5min', 'late_start', 'overdue', 'in_progress_overdue', 'previous_day_unstarted'
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (task_id, notification_type)
);

-- Preferências do usuário
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reminder_5min BOOLEAN DEFAULT TRUE,
  late_start BOOLEAN DEFAULT TRUE,
  overdue BOOLEAN DEFAULT TRUE,
  in_progress_overdue BOOLEAN DEFAULT TRUE,
  previous_day_unstarted BOOLEAN DEFAULT TRUE,
  UNIQUE (user_id)
);
```

Com RLS apropriado + políticas para service_role inserir notificações.

### Etapa 3 — Templates de email (5 templates React Email)

Criar em `_shared/transactional-email-templates/`:

| Template | Assunto | Quando |
|----------|---------|--------|
| `task-reminder-5min` | "Tarefa começa em 5 min: {título}" | 5 min antes do start_date |
| `task-late-start` | "Tarefa não iniciada: {título}" | start_date passou, status=pending |
| `task-overdue` | "Prazo excedido: {título}" | due_date passou, não completed |
| `task-in-progress-overdue` | "Tarefa em andamento passou do prazo: {título}" | in_progress + due_date passou |
| `task-previous-day-unstarted` | "Tarefa de ontem sem início: {título}" | Dia anterior, status=pending |

Todos com visual da marca Exato (azul primário, fonte Inter).

### Etapa 4 — Edge Function `check-task-notifications`

Uma única função que:

1. Busca todas as empresas e seus fusos
2. Para cada empresa, calcula o "agora" no fuso local (fake UTC)
3. Verifica cada condição:
   - **5 min antes**: `start_date` entre agora e agora+5min, status=pending, sem registro em task_email_notifications
   - **Início atrasado**: `start_date < agora`, status=pending, sem notificação enviada
   - **Prazo excedido**: `due_date < agora`, status não completed, sem notificação enviada
   - **Em andamento + prazo**: status=in_progress, `due_date < agora`, sem notificação
   - **Ontem sem início**: roda só entre 7h-8h local, tarefas de ontem com status=pending
4. Para cada tarefa encontrada, busca email do assigned_to e preferências
5. Chama `send-transactional-email` via `supabase.functions.invoke()`
6. Registra em `task_email_notifications`

### Etapa 5 — Cron job (pg_cron)

```sql
SELECT cron.schedule('check-task-notifications', '* * * * *', ...);
```

Roda a cada 1 minuto para capturar o lembrete de 5 min com precisão.

### Etapa 6 — Tela de preferências

Adicionar uma nova tab "Notificações" (ícone Bell) em `/settings` com toggles para cada tipo de notificação por email.

### Prevenção de spam

- Constraint `UNIQUE (task_id, notification_type)` impede envio duplicado
- Preferências do usuário respeitadas antes de cada envio
- Tabela `suppressed_emails` do sistema já bloqueia endereços com bounce/complaint

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| Migração SQL | 2 tabelas novas + RLS |
| 5 templates `.tsx` | Em `_shared/transactional-email-templates/` |
| `registry.ts` | Registrar os 5 templates |
| `supabase/functions/check-task-notifications/index.ts` | Nova Edge Function |
| `supabase/config.toml` | Configuração da nova função |
| `src/pages/Settings.tsx` | Nova tab "Notificações" |
| Novo componente `NotificationPreferences.tsx` | UI de preferências |
| Cron job SQL (via insert tool) | Agendar execução a cada minuto |

