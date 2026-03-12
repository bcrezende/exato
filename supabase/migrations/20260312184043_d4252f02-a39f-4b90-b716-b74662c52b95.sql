CREATE TABLE public.task_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('started', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own logs"
  ON public.task_time_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view logs"
  ON public.task_time_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_time_logs.task_id
      AND t.company_id = get_user_company_id(auth.uid())
  ));