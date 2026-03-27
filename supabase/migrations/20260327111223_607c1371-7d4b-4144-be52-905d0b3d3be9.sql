
CREATE POLICY "Users can delete own time logs"
ON public.task_time_logs FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can delete time logs in company"
ON public.task_time_logs FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_time_logs.task_id
      AND t.company_id = get_user_company_id(auth.uid())
  )
);
