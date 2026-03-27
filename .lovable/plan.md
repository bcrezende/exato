

## Corrigir horário do cron `mark-not-done-daily`

### Problema

O cron roda às 23:59 UTC (20:59 BRT). Nesse horário, "hoje" em São Paulo ainda é o mesmo dia, então tarefas desse dia não são marcadas como "não feitas". Elas só seriam processadas ~21 horas depois, na próxima execução.

### Solução

Alterar o cron de `59 23 * * *` para `1 3 * * *` (03:01 UTC = 00:01 BRT). Assim, quando a função roda, "hoje" em São Paulo já é o dia seguinte, e as tarefas do dia anterior são corretamente capturadas.

### Detalhes técnicos

1. **Remover o cron antigo** via SQL:
```sql
SELECT cron.unschedule('mark-not-done-daily');
```

2. **Criar o novo cron** com horário corrigido:
```sql
SELECT cron.schedule(
  'mark-not-done-daily',
  '1 3 * * *',
  $$ SELECT net.http_post(
    url:='https://nfrhxwehfqerasvlfnxv.supabase.co/functions/v1/mark-not-done-daily',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ..."}'::jsonb,
    body:='{"time": "scheduled"}'::jsonb
  ) AS request_id; $$
);
```

### Observação

As 4 tarefas de ontem já foram marcadas agora pela chamada manual que fiz durante a investigação. Os usuários já devem ver o aviso.

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| SQL (cron job) | Reagendar de 23:59 UTC para 03:01 UTC |

