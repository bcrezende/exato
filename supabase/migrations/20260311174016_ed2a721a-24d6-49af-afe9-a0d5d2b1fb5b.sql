CREATE OR REPLACE FUNCTION public.handle_registration(_user_id uuid, _company_name text, _full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
BEGIN
  INSERT INTO public.companies (name) VALUES (_company_name) RETURNING id INTO _company_id;
  
  INSERT INTO public.profiles (id, company_id, full_name)
  VALUES (_user_id, _company_id, _full_name)
  ON CONFLICT (id) DO UPDATE SET company_id = _company_id, full_name = _full_name;
  
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;