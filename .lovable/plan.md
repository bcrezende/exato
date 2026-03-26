

## Corrigir timestamps dos time logs existentes (offset de 3h)

### Situação atual

Existem **766 registros** na tabela `task_time_logs` (de 16/03 a 26/03) onde o `created_at` foi salvo com `now()` do servidor (UTC real). Como o fuso é `America/Sao_Paulo` (UTC-3), todos os timestamps estão **3 horas adiantados** em relação ao horário local real.

Exemplo: um usuário iniciou uma tarefa às 08:30 local → foi salvo como `11:30:00+00` → exibido como 11:30 (errado).

### Como identificar

Todos os 766 logs existentes foram afetados — nenhum foi salvo com o novo formato fake UTC ainda. A identificação é simples: **todos os registros com microssegundos no `created_at`** vieram do `now()` do servidor.

### Solução

Uma única migração SQL que subtrai 3 horas de todos os registros existentes:

```sql
UPDATE task_time_logs
SET created_at = created_at - INTERVAL '3 hours';
```

Isso converte `11:30:00+00` → `08:30:00+00`, alinhando com o padrão fake UTC do projeto.

A mesma correção deve ser aplicada à tabela `task_delays`, que também usa `now()` nos campos `actual_time` e `created_at`:

```sql
UPDATE task_delays
SET created_at = created_at - INTERVAL '3 hours',
    actual_time = actual_time - INTERVAL '3 hours';
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| Migração SQL | `UPDATE task_time_logs` e `UPDATE task_delays` subtraindo 3h |

Nenhuma alteração de código — apenas correção de dados históricos.

