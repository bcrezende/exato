

## Plano: Registro de tempo de execução das tarefas

### O que será feito
Criar um sistema de log que registra quando uma tarefa é iniciada e concluída, permitindo calcular o tempo de execução.

### 1. Nova tabela `task_time_logs`

```sql
CREATE TABLE public.task_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('started', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem inserir logs das próprias tarefas
CREATE POLICY "Users can insert own logs"
  ON public.task_time_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuários podem ver logs de tarefas da mesma empresa
CREATE POLICY "Users can view logs"
  ON public.task_time_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_time_logs.task_id
      AND t.company_id = get_user_company_id(auth.uid())
  ));
```

### 2. Alterar `src/lib/task-utils.ts`

Após atualizar o status, inserir um registro em `task_time_logs`:
- Se `newStatus === "in_progress"` → inserir log com `action = 'started'`
- Se `newStatus === "completed"` → inserir log com `action = 'completed'`

### 3. Exibir tempo de execução

No `TaskDetailModal`, consultar os logs da tarefa e calcular a duração entre `started` e `completed`, exibindo no modal de detalhes (ex: "Tempo de execução: 2h 35min").

### Arquivos alterados
- **Migração SQL** — criar tabela `task_time_logs`
- **`src/lib/task-utils.ts`** — inserir logs ao mudar status
- **`src/components/tasks/TaskDetailModal.tsx`** — exibir tempo de execução

