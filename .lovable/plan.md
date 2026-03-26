

## Corrigir INSERT irrestrito na tabela task_delays

### Análise

A tabela `task_delays` recebe inserções exclusivamente do trigger `detect_task_delay()`, que é `SECURITY DEFINER` (executa como service_role). Não há inserção direta pelo frontend.

Solução: restringir INSERT ao `service_role`, igual ao que fizemos com `notifications`.

### Migração SQL

```sql
DROP POLICY IF EXISTS "Authenticated can insert delays" ON task_delays;

CREATE POLICY "Service role can insert delays"
ON public.task_delays FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| Migração SQL | Substituir policy de INSERT por service_role only |

Nenhuma alteração de código frontend necessária.

