
DROP POLICY "Admins managers coordinators and creators can delete tasks" ON public.tasks;

CREATE POLICY "Admins managers coordinators and creators can delete tasks"
ON public.tasks
FOR DELETE
USING (
  (company_id = get_user_company_id(auth.uid())) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (created_by = auth.uid())
    OR (has_role(auth.uid(), 'manager'::app_role) AND (department_id = get_user_department_id(auth.uid())))
    OR (has_role(auth.uid(), 'coordinator'::app_role) AND (
      assigned_to IN (SELECT get_coordinator_analyst_ids(auth.uid()))
      OR assigned_to = auth.uid()
    ))
  )
);
