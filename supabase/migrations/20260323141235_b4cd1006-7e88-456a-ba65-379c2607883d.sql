
-- 1. Add 'not_done' to task_status enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'not_done';

-- 2. Create task_not_done_logs table
CREATE TABLE public.task_not_done_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  reason TEXT,
  auto_generated BOOLEAN DEFAULT FALSE,
  original_due_date TIMESTAMPTZ NOT NULL,
  next_action TEXT DEFAULT 'Aguardando ação do usuário',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_not_done_user ON public.task_not_done_logs(user_id);
CREATE INDEX idx_not_done_task ON public.task_not_done_logs(task_id);
CREATE INDEX idx_not_done_action ON public.task_not_done_logs(next_action);

-- 3. Enable RLS
ALTER TABLE public.task_not_done_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS: Users can view not_done logs for tasks in their company
CREATE POLICY "Users can view not done logs in company"
ON public.task_not_done_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_not_done_logs.task_id
    AND t.company_id = get_user_company_id(auth.uid())
  )
);

-- 5. RLS: Users can insert their own logs
CREATE POLICY "Users can insert own not done logs"
ON public.task_not_done_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 6. RLS: Users can update own logs, admins/managers/coordinators can update company logs
CREATE POLICY "Users can update own not done logs"
ON public.task_not_done_logs FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Managers can update not done logs"
ON public.task_not_done_logs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_not_done_logs.task_id
    AND t.company_id = get_user_company_id(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'coordinator')
  )
);

-- 7. Update notify_task_changes to handle not_done status label
CREATE OR REPLACE FUNCTION public.notify_task_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _status_label text;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NEW.assigned_to, 'Nova tarefa atribuída', NEW.title, 'task_assigned', NEW.id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.assigned_to IS NOT NULL THEN
    _status_label := CASE NEW.status::text
      WHEN 'pending' THEN 'Pendente'
      WHEN 'in_progress' THEN 'Em andamento'
      WHEN 'completed' THEN 'Concluída'
      WHEN 'overdue' THEN 'Atrasada'
      WHEN 'not_done' THEN 'Não feita'
      ELSE NEW.status::text
    END;

    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NEW.assigned_to, 'Status da tarefa alterado', NEW.title || ' → ' || _status_label, 'task_status_changed', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
