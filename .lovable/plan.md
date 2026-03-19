

## Diagnóstico completo da causa raiz dos timeouts

A investigação do backend revelou a causa real dos timeouts persistentes:

### Causa raiz: sobrecarga do banco por cron jobs a cada 5 segundos

1. **Cron job de email rodando a cada 5 segundos** (job #3) -- chama a edge function `process-email-queue` que faz múltiplas queries ao banco. A function está falhando com 503/504 (timeout), mas o cron continua chamando a cada 5s, acumulando conexões.

2. **Cron jobs duplicados de tarefas recorrentes** -- jobs #1 e #2 fazem a mesma coisa (chamam `generate-recurring-tasks` a cada hora). Dobro de carga desnecessária.

3. **Conexões presas** -- há uma conexão postgrest "idle in transaction" por mais de 4 minutos, e 22 conexões em espera. O pool de conexões (max 10 para postgrest) está saturado.

4. **RLS policies pesadas amplificam o problema** -- cada query a `profiles`, `user_roles`, `tasks` etc. avalia policies que chamam `get_user_company_id()` e `has_role()`, gerando subconsultas adicionais. Com 15 rows em profiles mas **401.096 sequential scans**, o overhead de RLS é desproporcional.

5. **Fila de emails quebrada** -- 25 emails falharam, 6 pendentes, apenas 1 enviado. O cron continua tentando processar a fila quebrada, gerando carga constante sem resultado.

```text
Ciclo vicioso atual:
pg_cron (5s) → edge function → múltiplas queries → RLS avalia subconsultas →
conexões saturam → auth/profiles/user_roles dão timeout → login falha
```

### Plano de ação

#### 1. Pausar cron jobs que saturam o banco (migração SQL)
- Desativar o cron job de email (job #3 -- roda a cada 5s)
- Remover o cron job duplicado de recorrência (job #2 -- duplicata do #1)
- Isso libera imediatamente o pool de conexões

#### 2. Adicionar retry automático no AuthContext
- Quando `fetchUserData` falha por timeout, tentar novamente automaticamente (até 2 retries com delay crescente)
- Isso cobre o caso em que o backend está momentaneamente lento mas se recupera em segundos
- Manter o botão manual de retry como fallback final

#### 3. Reduzir frequência do cron de email para quando reativar
- Mudar de 5 segundos para 30 segundos ou 1 minuto
- Suficiente para processar emails sem saturar conexões

#### 4. Limpar fila de emails pendentes/falhados
- Os 6 emails pendentes e 25 falhados estão gerando queries repetidas sem resultado
- Limpar a fila para o cron não processar lixo quando for reativado

### Arquivos impactados
- Migração SQL: desativar cron jobs
- `src/contexts/AuthContext.tsx`: adicionar auto-retry com backoff

### Resultado esperado
- Login deve funcionar imediatamente após pausar os cron jobs
- Pool de conexões volta ao normal
- Retry automático cobre instabilidades residuais

