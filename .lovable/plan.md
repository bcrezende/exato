

## Diagnóstico: Tarefas duplicadas no dia 14/03

### Causa raiz confirmada

A query no banco mostra claramente o problema: para cada tarefa recorrente, existem **2 instâncias idênticas** no dia 14, criadas no mesmo segundo (ex: `13:00:02.508` e `13:00:02.549`).

Isso é uma **race condition clássica**. A edge function foi chamada duas vezes simultaneamente (cron + invocação manual, ou duas execuções paralelas). A verificação de existência (linhas 122-131) é feita via SELECT antes do INSERT — ambas execuções fazem o SELECT ao mesmo tempo, ambas encontram zero resultados, e ambas inserem.

### Tarefas duplicadas encontradas (dia 14/03)
- Análise de fluxo de caixa (2x)
- Cobrança de vencidos (2x)
- Gerar multipag e enviar para o banco (2x)
- Gerir pendências (2x)
- Gestão Tickets diário (2x)
- Solicitar Previsão de PIX diário (2x)
- Validação de faturas criadas no dia anterior (2x)

### Solução

**1. Prevenir futuras duplicatas** — adicionar uma constraint UNIQUE parcial no banco:

```sql
CREATE UNIQUE INDEX unique_recurring_instance 
ON tasks (recurrence_parent_id, start_date::date)
WHERE recurrence_parent_id IS NOT NULL;
```

Isso garante que, mesmo com execuções paralelas, o banco rejeita o segundo INSERT. A edge function já pode tratar o erro de constraint como "já existe, pular".

**2. Limpar duplicatas existentes** — migration SQL para deletar as cópias extras do dia 14 (manter apenas a primeira por `created_at`).

**3. Ajustar a edge function** — tratar o erro de violação de unique constraint (`23505`) como caso normal (skip), em vez de logar como erro.

### Arquivos alterados
- **Migration SQL**: constraint unique + limpeza de duplicatas existentes
- **`supabase/functions/generate-recurring-tasks/index.ts`**: tratar erro `23505` como skip

