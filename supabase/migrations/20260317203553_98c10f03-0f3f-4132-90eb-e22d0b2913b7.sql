
-- Create trigger to seed recurrence_definitions for new companies
CREATE OR REPLACE FUNCTION public.seed_recurrence_definitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.recurrence_definitions (company_id, name, key, interval_value, interval_unit, max_span_days, is_system)
  VALUES
    (NEW.id, 'Nenhuma', 'none', 0, 'day', 0, true),
    (NEW.id, 'Diária', 'daily', 1, 'day', 1, true),
    (NEW.id, 'Semanal', 'weekly', 1, 'week', 7, true),
    (NEW.id, 'Mensal', 'monthly', 1, 'month', 30, true),
    (NEW.id, 'Anual', 'yearly', 1, 'year', 365, true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_seed_recurrence_definitions
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.seed_recurrence_definitions();
