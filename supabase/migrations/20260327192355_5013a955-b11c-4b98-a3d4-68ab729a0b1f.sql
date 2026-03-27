CREATE POLICY "Only admins and managers can insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);