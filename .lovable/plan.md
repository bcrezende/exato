

## Plano: Corrigir invocação da Edge Function pelo frontend

### Problema identificado
1. **`supabase/config.toml`** não tem `verify_jwt = false` para a função `generate-recurring-tasks`. Por padrão, o JWT é verificado, e se houver qualquer problema com o token do usuário, a chamada falha silenciosamente (o `catch` no `task-utils.ts` apenas faz `console.error`).
2. Os **CORS headers** na Edge Function estão incompletos — faltam headers que o SDK do Supabase envia (`x-supabase-client-platform`, etc.).

### Solução

**`supabase/config.toml`** — Adicionar configuração para desabilitar verificação de JWT (a função já usa `SERVICE_ROLE_KEY` internamente):
```toml
[functions.generate-recurring-tasks]
verify_jwt = false
```

**`supabase/functions/generate-recurring-tasks/index.ts`** — Atualizar CORS headers para incluir todos os headers enviados pelo SDK:
```
x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version
```

**`src/lib/task-utils.ts`** — Melhorar o tratamento de erro para logar a resposta completa da Edge Function, facilitando debug futuro.

### Resultado esperado
Ao concluir uma tarefa recorrente no frontend, a Edge Function será invocada com sucesso e a próxima instância será gerada imediatamente.

