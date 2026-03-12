

## Plano: Configurar Cron para Geração Automática por Data

### Situação Atual
A Edge Function `generate-recurring-tasks` já tem toda a lógica necessária:
- Marca tarefas com `due_date` passado como `overdue`
- Gera próxima instância quando a última está `completed` OU `overdue`

**O problema**: as extensões `pg_cron` e `pg_net` foram instaladas, mas nenhum job cron foi criado. A função só é chamada quando o funcionário conclui uma tarefa. Se ninguém concluir, nada acontece.

### Solução
Criar uma migration que agenda um job `pg_cron` para chamar a Edge Function a cada hora via `pg_net`.

### Alteração

**Nova migration SQL** — Agendar chamada horária:
```sql
SELECT cron.schedule(
  'generate-recurring-tasks',
  '0 * * * *',  -- a cada hora
  $$
  SELECT net.http_post(
    url := '<supabase_url>/functions/v1/generate-recurring-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <service_role_key>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Isso garante que, mesmo sem ação do funcionário, o sistema:
1. Detecta tarefas atrasadas automaticamente
2. Gera a próxima instância recorrente

Nenhuma alteração de código front-end necessária — o fluxo de "concluir e gerar imediatamente" continua funcionando em paralelo.

