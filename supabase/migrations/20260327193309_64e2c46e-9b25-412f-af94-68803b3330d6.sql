DROP POLICY IF EXISTS "Admins can update profiles in own company" ON public.profiles;

CREATE POLICY "Admins can update profiles in own company"
ON public.profiles FOR UPDATE TO public
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
  AND NOT (is_master IS DISTINCT FROM (SELECT p.is_master FROM profiles p WHERE p.id = profiles.id))
);