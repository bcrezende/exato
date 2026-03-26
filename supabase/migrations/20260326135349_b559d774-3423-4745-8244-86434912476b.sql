
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token uuid)
RETURNS TABLE(id uuid, email text, token uuid, company_id uuid, department_id uuid, role app_role, company_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT i.id, i.email, i.token, i.company_id, i.department_id, i.role,
           c.name AS company_name
    FROM invitations i
    LEFT JOIN companies c ON c.id = i.company_id
    WHERE i.token = _token AND i.accepted_at IS NULL;
END;
$$;

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON invitations;
DROP POLICY IF EXISTS "Anyone can update invitation to accept" ON invitations;
