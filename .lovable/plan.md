

## Corrigir 401 persistente nas notificações de email

### Causa raiz confirmada

A função `send-transactional-email` está configurada com `verify_jwt = true` no `config.toml`. O gateway do Supabase valida o JWT antes de a requisição chegar à função. Quando `check-task-notifications` faz a chamada interna com o `service_role` key, o gateway rejeita com `"Invalid Token or Protected Header formatting"` — o JWT não é aceito no formato esperado pelo gateway nesse contexto de função-para-função.

### Solução

Alterar `send-transactional-email` para `verify_jwt = false` no `config.toml` (como já é feito na maioria das outras funções do projeto) e adicionar validação de auth em código dentro da própria função, verificando que o caller tem role `service_role` ou `authenticated`.

### Detalhes técnicos

**1. `supabase/config.toml`** — Mudar `verify_jwt` de `true` para `false`:
```toml
[functions.send-transactional-email]
  verify_jwt = false
```

**2. `supabase/functions/send-transactional-email/index.ts`** — Adicionar validação de auth em código no início do handler:
```typescript
const authHeader = req.headers.get('Authorization')
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
}
```

**3. Redeploy** — Fazer deploy de `send-transactional-email` e `check-task-notifications` após as mudanças.

**4. Limpeza** — Remover registros da task de teste em `task_email_notifications` para permitir reprocessamento.

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/config.toml` | `verify_jwt = false` para send-transactional-email |
| `supabase/functions/send-transactional-email/index.ts` | Adicionar validação de auth em código |
| Migração SQL | Limpar notificações da task de teste |

