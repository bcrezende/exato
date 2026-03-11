

## Plano: Motor de Recorrência Automática via Cron

### Conceito

Criar uma Edge Function que roda automaticamente a cada hora via `pg_cron`. Ela lê tarefas recorrentes (daily/weekly/monthly/yearly) e gera novas instâncias quando necessário.

### 1. Edge Function `generate-recurring-tasks`

**Lógica:**
- Busca tarefas com `recurrence_type != 'none'` e `status = 'completed'` (ou a última instância completada)
- Para cada tarefa recorrente, verifica se já existe uma instância para o período atual (hoje para diária, semana atual para semanal, etc.)
- Se não existir, cria nova tarefa com:
  - Mesmo título, descrição, prioridade, assigned_to, department_id, company_id
  - `recurrence_parent_id` apontando para a tarefa original
  - `status = 'pending'`
  - `start_date` e `due_date` ajustados para o novo período (mantendo a mesma duração)
- Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS

**Arquivo:** `supabase/functions/generate-recurring-tasks/index.ts`

### 2. Configuração do Cron

Adicionar ao `config.toml`:
```toml
[functions.generate-recurring-tasks]
verify_jwt = false
```

Executar SQL (via insert tool, não migração) para criar o cron job que roda a cada hora:
```sql
-- Habilitar extensões pg_cron e pg_net
-- Criar job que invoca a function a cada hora
```

### 3. Lógica de geração de datas

- **Diária**: próximo dia após a última instância
- **Semanal**: +7 dias
- **Mensal**: +1 mês
- **Anual**: +1 ano
- Mantém a duração original (diferença entre start_date e due_date)

### Arquivos
- `supabase/functions/generate-recurring-tasks/index.ts` — novo
- `supabase/config.toml` — adicionar config da function
- SQL via insert tool para pg_cron

