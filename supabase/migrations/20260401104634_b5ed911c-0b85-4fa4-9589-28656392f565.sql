CREATE OR REPLACE FUNCTION public.export_users_csv()
RETURNS TABLE(
  id uuid,
  email text,
  nome text,
  role app_role,
  departamento text,
  department_id uuid,
  company_id uuid,
  encrypted_password text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    u.email::text,
    p.full_name AS nome,
    ur.role,
    d.name AS departamento,
    p.department_id,
    p.company_id,
    u.encrypted_password::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.departments d ON d.id = p.department_id
  ORDER BY p.full_name;
END;
$$;