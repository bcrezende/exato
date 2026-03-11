
CREATE OR REPLACE FUNCTION public.handle_accept_invite(
  _user_id uuid,
  _invitation_id uuid,
  _full_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
BEGIN
  SELECT * INTO _inv FROM public.invitations WHERE id = _invitation_id AND accepted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already accepted';
  END IF;

  INSERT INTO public.profiles (id, company_id, department_id, full_name)
  VALUES (_user_id, _inv.company_id, _inv.department_id, _full_name)
  ON CONFLICT (id) DO UPDATE SET
    company_id = _inv.company_id,
    department_id = _inv.department_id,
    full_name = _full_name;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _inv.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.invitations SET accepted_at = now() WHERE id = _invitation_id;
END;
$$;
