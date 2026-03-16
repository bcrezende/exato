CREATE POLICY "Employees can create own tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
  AND assigned_to = auth.uid()
  AND has_role(auth.uid(), 'employee')
);