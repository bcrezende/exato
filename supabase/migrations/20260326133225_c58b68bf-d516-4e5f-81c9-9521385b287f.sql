CREATE OR REPLACE FUNCTION public.reset_dismiss_whats_new()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    UPDATE public.profiles SET dismiss_whats_new = false WHERE dismiss_whats_new = true;
  ELSE
    UPDATE public.profiles SET dismiss_whats_new = false WHERE company_id = NEW.company_id AND dismiss_whats_new = true;
  END IF;
  RETURN NEW;
END;
$$;