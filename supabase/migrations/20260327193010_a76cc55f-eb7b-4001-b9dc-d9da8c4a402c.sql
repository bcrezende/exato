DROP POLICY IF EXISTS "Managers can insert limited roles" ON public.user_roles;

CREATE POLICY "Managers can insert limited roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  AND user_roles.user_id != auth.uid()
  AND role = ANY (ARRAY['analyst'::app_role, 'coordinator'::app_role, 'employee'::app_role])
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
      AND p.company_id = get_user_company_id(auth.uid())
  )
);