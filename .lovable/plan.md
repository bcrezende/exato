

## Diagnóstico Final: Por que o login ainda trava

### Causa raiz encontrada

A tabela `net._http_response` tem **340 requisições com status NULL** (de um total de 3.571). Essas são chamadas HTTP do `pg_net` (usadas pelos cron jobs) que nunca receberam resposta. O worker do `pg_net` mantém conexões abertas aguardando esses responses, consumindo slots do pool de conexões do banco.

Mesmo após reduzir o cron de email de 5s para 1min, o cron **continua ativo** (job #4) e gerando novas requisições que potencialmente travam. Além disso, os 340 responses pendentes nunca são limpos automaticamente.

```text
Fluxo atual:
cron job → pg_net.http_post() → edge function timeout → response fica NULL →
worker pg_net segura conexão → pool satura → queries de profiles/user_roles levam 13-64s →
FETCH_TIMEOUT de 12s expira → login trava
```

Adicionalmente, o `Login.tsx` tem um bug: quando o auth **sucede** mas o fetch de profile/role **falha** (profileError), o botão fica em "Entrando..." para sempre porque o `loading` local nunca é resetado.

### Plano de ação

#### 1. Migração SQL: Desativar cron jobs e limpar pg_net
- Desativar **ambos** os cron jobs ativos (job #1 e #4)
- Limpar a tabela `net._http_response` (remover as 3.571 entradas acumuladas)
- Isso libera imediatamente as conexões presas do pg_net

#### 2. Corrigir bug do Login.tsx
- O botão "Entrando..." fica travado quando auth sucede mas profile falha
- Adicionar watch do estado `profileError` do AuthContext
- Quando `profileError` é true, resetar `loading` local e mostrar toast de erro
- Permitir que o usuário tente novamente

#### 3. Aumentar FETCH_TIMEOUT no AuthContext
- Aumentar de 12s para 20s para cobrir a latência real do banco (queries levando 13s+)
- Manter retry com backoff para resiliência

#### 4. Recriar cron jobs com proteção
- Recriar o cron de tarefas recorrentes com frequência menor (a cada 6 horas em vez de 1 hora)
- Manter o cron de email **desativado** até estabilizar
- Futuramente, adicionar `statement_timeout` no comando do cron

### Arquivos impactados
- Migração SQL (desativar crons + limpar pg_net)
- `src/pages/Login.tsx` (corrigir bug do loading)
- `src/contexts/AuthContext.tsx` (aumentar timeout)

### Resultado esperado
- Pool de conexões volta ao normal imediatamente
- Login deve completar em poucos segundos
- Botão "Entrar" nunca mais fica travado indefinidamente

