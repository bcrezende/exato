

## Enriquecer o Painel de Monitoramento de Emails

### Resumo

Adicionar dados contextuais aos logs de email (nome do destinatário, ID/título da tarefa) e criar uma interface para personalizar os templates de email, tudo acessível pelo Master Admin.

### Parte 1 — Dados contextuais nos logs

**Problema**: O `email_send_log` tem uma coluna `metadata` (jsonb) que não está sendo preenchida. Os dados como `assigneeName`, `taskTitle` e `taskId` existem no momento do envio mas não são persistidos.

**Solução**:

1. **`send-transactional-email/index.ts`** — Ao inserir no `email_send_log` (status `pending`), salvar `templateData` na coluna `metadata`:
   ```typescript
   metadata: { ...templateData }
   ```

2. **`check-task-notifications/index.ts`** — Incluir `taskId` no `templateData` enviado:
   ```typescript
   templateData: {
     taskTitle: task.title,
     taskId: task.id,
     startTime: formatTime(task.start_date),
   }
   ```
   (Aplicar para todos os 5 tipos de notificação)

3. **`src/pages/EmailMonitor.tsx`** — Adicionar colunas na tabela:
   - **Destinatário** (já existe) → manter email + exibir nome do `metadata.assigneeName`
   - **Tarefa** → exibir `metadata.taskTitle` e `metadata.taskId` (truncado)
   - Reorganizar colunas: Template | Destinatário (nome + email) | Tarefa | Status | Data | Erro

### Parte 2 — Editor de templates de email

**Problema**: Hoje os templates são arquivos `.tsx` no código. O usuário quer poder personalizar o corpo dos emails pela interface.

**Solução**: Criar uma nova aba/seção no painel com preview e edição dos templates.

1. **Nova tabela `email_template_overrides`**:
   ```sql
   CREATE TABLE public.email_template_overrides (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     template_name text NOT NULL UNIQUE,
     subject_override text,
     heading_override text,
     body_override text,
     updated_at timestamptz DEFAULT now(),
     updated_by uuid REFERENCES auth.users(id)
   );
   ```
   RLS: apenas `is_master` pode ler/escrever.

2. **Atualizar `send-transactional-email`** para consultar `email_template_overrides` antes de renderizar. Se houver override, substituir o subject, heading e body text do template.

3. **UI no `EmailMonitor.tsx`** — Adicionar aba "Personalizar Templates":
   - Lista dos 5 templates com nome amigável
   - Ao clicar, abre modal com campos: Assunto, Título, Corpo
   - Preview do email ao lado
   - Botão salvar que grava na tabela `email_template_overrides`

### Redeploy

Redeployar `send-transactional-email` e `check-task-notifications` após as mudanças.

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/check-task-notifications/index.ts` | Adicionar `taskId` ao templateData |
| `supabase/functions/send-transactional-email/index.ts` | Salvar templateData no metadata do log; consultar overrides |
| `src/pages/EmailMonitor.tsx` | Novas colunas (nome, tarefa) + aba de personalização de templates |
| Migração SQL | Tabela `email_template_overrides` com RLS |

