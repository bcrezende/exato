DROP POLICY IF EXISTS "Users can create comments on accessible tasks" ON task_comments;

CREATE POLICY "Users can create comments on accessible tasks"
ON public.task_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_comments.task_id
      AND t.company_id = get_user_company_id(auth.uid())
      AND (
        t.assigned_to = auth.uid()
        OR t.created_by = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR (has_role(auth.uid(), 'manager'::app_role) AND t.department_id = get_user_department_id(auth.uid()))
        OR (has_role(auth.uid(), 'coordinator'::app_role) AND t.assigned_to IN (SELECT get_coordinator_analyst_ids(auth.uid())))
      )
  )
);