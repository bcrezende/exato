

## Diagnóstico do Sistema de Emails de Notificação

### Problemas encontrados

**1. `send-transactional-email` nunca foi deployed**
- Não existem logs para esta Edge Function — nenhuma invocação chegou a executar
- A função retorna 401 "Invalid JWT" ao ser chamada, o que confirma que não está deployed (ou não está acessível)
- Resultado: **nenhum email de notificação de tarefa foi enviado** apesar de 10+ notificações terem sido detectadas

**2. `check-task-notifications` não valida resposta do invoke**
- O código faz `await supabase.functions.invoke(...)` mas não verifica `{ data, error }` retornado
- Independente de o email ter sido enviado ou não, registra a notificação como "enviada" em `task_email_notifications`
- Isso impede reenvio futuro — a notificação fica marcada como enviada mas nunca foi

**3. Dados atuais no banco**
- `email_send_log`: **0 registros** com template `task-*` — nenhum email de tarefa foi processado
- `task_email_notifications`: **10+ registros** — notificações detectadas mas nunca enviadas de fato
- Todos os 24 emails com status `dlq` são de convites antigos (TTL expirado), não relacionados

### Plano de correção

**Etapa 1 — Deploy das Edge Functions faltantes**

Deployar todas as Edge Functions do sistema de email transacional:
- `send-transactional-email`
- `handle-email-unsubscribe`
- `handle-email-suppression`
- `process-email-queue`

**Etapa 2 — Corrigir `check-task-notifications` para validar resposta**

Alterar o bloco de envio para verificar o retorno do invoke antes de registrar:

```typescript
const { error: invokeError } = await supabase.functions.invoke('send-transactional-email', {
  body: { ... },
})

if (invokeError) {
  console.error('Failed to invoke send-transactional-email', { error: invokeError, taskId, type })
  continue  // NÃO registrar como enviado
}

// Só registra se o envio foi bem-sucedido
await supabase.from('task_email_notifications').upsert(...)
```

**Etapa 3 — Limpar notificações "fantasma"**

Migração SQL para deletar os registros em `task_email_notifications` que foram marcados como enviados mas nunca resultaram em email:

```sql
DELETE FROM task_email_notifications;
```

Isso permite que o sistema reprocesse todas as tarefas pendentes na próxima execução do cron.

**Etapa 4 — Re-deploy de `check-task-notifications`**

Após a correção do código, re-deployar a função.

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/check-task-notifications/index.ts` | Validar retorno do invoke antes de registrar notificação |
| Deploy | `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, `process-email-queue`, `check-task-notifications` |
| Migração SQL | Limpar `task_email_notifications` para permitir reprocessamento |

