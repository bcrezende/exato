DROP POLICY IF EXISTS "Users can insert own not done logs" ON public.task_not_done_logs;

CREATE POLICY "Users can insert own not done logs"
ON public.task_not_done_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_not_done_logs.task_id
      AND t.company_id = get_user_company_id(auth.uid())
  )
);