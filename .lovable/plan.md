

## Corrigir 401 nas notificações de email de tarefas

### Causa raiz

A função `check-task-notifications` cria um client Supabase com a service_role key e chama `supabase.functions.invoke('send-transactional-email', ...)`. Porém, no contexto de Edge Functions chamando outras Edge Functions, o gateway retorna 401 porque o JWT não é propagado corretamente pelo `functions.invoke()`.

### Solução

Substituir `supabase.functions.invoke()` por uma chamada HTTP direta (`fetch`) com o header `Authorization: Bearer <service_role_key>` explícito. Isso garante que o gateway receba o JWT correto.

### Detalhes técnicos

No `check-task-notifications/index.ts`, na seção que envia notificações (~linha 230), trocar:

```typescript
// ANTES (quebrado)
await supabase.functions.invoke('send-transactional-email', {
  body: { templateName, recipientEmail, idempotencyKey, templateData }
})

// DEPOIS (funcional)
const res = await fetch(
  `${supabaseUrl}/functions/v1/send-transactional-email`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ templateName, recipientEmail, idempotencyKey, templateData }),
  }
)
```

Além disso, limpar os registros da tabela `task_email_notifications` para a tarefa de teste, para que o sistema tente novamente na próxima execução do cron.

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/check-task-notifications/index.ts` | Trocar `functions.invoke` por `fetch` direto com auth header |
| Migração SQL | Limpar registros de notificação da tarefa de teste |

