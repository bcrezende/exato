DROP POLICY IF EXISTS "Admins can insert any role" ON public.user_roles;

CREATE POLICY "Admins can insert any role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
      AND p.company_id = get_user_company_id(auth.uid())
  )
);