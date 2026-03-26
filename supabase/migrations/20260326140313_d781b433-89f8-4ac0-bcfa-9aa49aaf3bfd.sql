
-- Fix: Restrict role assignment - managers can only assign analyst/coordinator/employee, admins can assign any role
DROP POLICY IF EXISTS "Admins and managers can manage roles" ON user_roles;

CREATE POLICY "Admins can insert any role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can insert limited roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  AND role IN ('analyst'::app_role, 'coordinator'::app_role, 'employee'::app_role)
);
