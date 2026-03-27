
DROP POLICY IF EXISTS "Admins managers and coordinators can create invitations" ON public.invitations;

-- Admins can invite any role
CREATE POLICY "Admins can create invitations"
ON public.invitations FOR INSERT TO public
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Managers can invite up to coordinator (not admin/manager)
CREATE POLICY "Managers can create invitations"
ON public.invitations FOR INSERT TO public
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
  AND role = ANY (ARRAY['coordinator'::app_role, 'analyst'::app_role, 'employee'::app_role])
);

-- Coordinators can only invite analysts/employees
CREATE POLICY "Coordinators can create invitations"
ON public.invitations FOR INSERT TO public
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'coordinator'::app_role)
  AND role = ANY (ARRAY['analyst'::app_role, 'employee'::app_role])
);
