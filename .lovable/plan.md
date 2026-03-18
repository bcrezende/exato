

## Sistema de Monitoramento de Atrasos

### Abordagem Recomendada

Em vez de criar uma nova tabela e trigger, recomendo **usar a tabela `task_time_logs` que já existe** e calcular os atrasos no frontend. Motivo: já temos logs de `started`, `started_late` e `completed` com timestamps, e as tarefas já têm `start_date` e `due_date`. Criar uma tabela redundante adiciona complexidade sem benefício real.

Porém, se você prefere a abordagem com tabela dedicada conforme descrito, segue o plano completo:

---

### 1. Migração — Tabela `task_delays`

```sql
CREATE TYPE public.delay_log_type AS ENUM ('inicio_atrasado', 'conclusao_atrasada');

CREATE TABLE public.task_delays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  log_type delay_log_type NOT NULL,
  scheduled_time timestamptz NOT NULL,
  actual_time timestamptz NOT NULL DEFAULT now(),
  delay_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, log_type)
);

ALTER TABLE public.task_delays ENABLE ROW LEVEL SECURITY;

-- RLS: mesma lógica da task_time_logs
CREATE POLICY "Users can view delays" ON public.task_delays
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_delays.task_id
    AND t.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "System can insert delays" ON public.task_delays
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

### 2. Trigger PostgreSQL (detecção automática)

```sql
CREATE OR REPLACE FUNCTION public.detect_task_delay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  _delay int;
BEGIN
  -- Início atrasado: status mudou para in_progress
  IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress'
     AND NEW.start_date IS NOT NULL AND now() > NEW.start_date THEN
    _delay := EXTRACT(EPOCH FROM (now() - NEW.start_date)) / 60;
    INSERT INTO task_delays (task_id, user_id, log_type, scheduled_time, actual_time, delay_minutes)
    VALUES (NEW.id, COALESCE(NEW.assigned_to, NEW.created_by), 'inicio_atrasado', NEW.start_date, now(), _delay)
    ON CONFLICT (task_id, log_type) DO NOTHING;
  END IF;

  -- Conclusão atrasada: status mudou para completed
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed'
     AND NEW.due_date IS NOT NULL AND now() > NEW.due_date THEN
    _delay := EXTRACT(EPOCH FROM (now() - NEW.due_date)) / 60;
    INSERT INTO task_delays (task_id, user_id, log_type, scheduled_time, actual_time, delay_minutes)
    VALUES (NEW.id, COALESCE(NEW.assigned_to, NEW.created_by), 'conclusao_atrasada', NEW.due_date, now(), _delay)
    ON CONFLICT (task_id, log_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_task_delay
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.detect_task_delay();
```

### 3. Dashboard — Novo componente `DelayKpiCards`

Arquivo: `src/components/dashboard/DelayKpiCards.tsx`

- Buscar dados de `task_delays` com filtros de período (hoje/semana/mês)
- Calcular:
  - **% Início Atrasado** = contagem `inicio_atrasado` / total tarefas iniciadas × 100
  - **% Conclusão Atrasada** = contagem `conclusao_atrasada` / total concluídas × 100
- Exibir 2 cards KPI + seletor de período (Hoje | Semana | Mês)
- Gráfico de tendência: agrupar `task_delays.created_at` por dia nos últimos 30 dias, plotar com Recharts (`AreaChart`)

### 4. Integração no Dashboard

Em `src/pages/Dashboard.tsx`:
- Importar `DelayKpiCards`
- Posicionar após os KPI cards existentes
- Passar `selectedDepartment` e `selectedEmployee` como filtros

### Arquivos afetados
- **Migração SQL**: nova tabela + trigger
- `src/components/dashboard/DelayKpiCards.tsx` (novo)
- `src/pages/Dashboard.tsx` (adicionar componente)

