
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

CREATE POLICY "Users can view delays" ON public.task_delays
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_delays.task_id
    AND t.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Authenticated can insert delays" ON public.task_delays
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.detect_task_delay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  _delay int;
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress'
     AND NEW.start_date IS NOT NULL AND now() > NEW.start_date THEN
    _delay := GREATEST(1, EXTRACT(EPOCH FROM (now() - NEW.start_date))::int / 60);
    INSERT INTO task_delays (task_id, user_id, log_type, scheduled_time, actual_time, delay_minutes)
    VALUES (NEW.id, COALESCE(NEW.assigned_to, NEW.created_by), 'inicio_atrasado', NEW.start_date, now(), _delay)
    ON CONFLICT (task_id, log_type) DO NOTHING;
  END IF;

  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed'
     AND NEW.due_date IS NOT NULL AND now() > NEW.due_date THEN
    _delay := GREATEST(1, EXTRACT(EPOCH FROM (now() - NEW.due_date))::int / 60);
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
