
-- Allow admins to update profiles of members in their company
CREATE POLICY "Admins can update profiles in own company"
ON public.profiles
FOR UPDATE
TO public
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update user_roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
);
