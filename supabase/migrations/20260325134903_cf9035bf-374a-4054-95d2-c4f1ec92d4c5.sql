
ALTER TABLE public.profiles ADD COLUMN dismiss_whats_new boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.reset_dismiss_whats_new()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET dismiss_whats_new = false
  WHERE company_id = NEW.company_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reset_dismiss_whats_new
AFTER INSERT ON public.changelog_entries
FOR EACH ROW EXECUTE FUNCTION public.reset_dismiss_whats_new();
