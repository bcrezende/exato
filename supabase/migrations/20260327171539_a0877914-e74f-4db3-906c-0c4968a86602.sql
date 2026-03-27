DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
      AND p.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
      AND p.company_id = get_user_company_id(auth.uid())
  )
);