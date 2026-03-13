
CREATE OR REPLACE FUNCTION public.get_task_import_assignees()
RETURNS TABLE(profile_id uuid, email text, full_name text, department_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _department_id uuid;
  _is_admin boolean;
  _is_manager boolean;
BEGIN
  _company_id := get_user_company_id(auth.uid());
  _department_id := get_user_department_id(auth.uid());
  _is_admin := has_role(auth.uid(), 'admin');
  _is_manager := has_role(auth.uid(), 'manager');

  IF _is_admin THEN
    RETURN QUERY
      SELECT p.id AS profile_id, u.email::text AS email, p.full_name, p.department_id
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.company_id = _company_id;
  ELSIF _is_manager THEN
    RETURN QUERY
      SELECT p.id AS profile_id, u.email::text AS email, p.full_name, p.department_id
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.company_id = _company_id AND p.department_id = _department_id;
  ELSE
    RETURN;
  END IF;
END;
$$;
