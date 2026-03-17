
-- Step 1: Create interval_unit enum
CREATE TYPE public.interval_unit AS ENUM ('day', 'week', 'month', 'year');

-- Step 2: Create recurrence_definitions table
CREATE TABLE public.recurrence_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  key text NOT NULL,
  interval_value integer NOT NULL DEFAULT 1,
  interval_unit interval_unit NOT NULL DEFAULT 'day',
  max_span_days integer NOT NULL DEFAULT 1,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (company_id, key)
);

-- Step 3: Enable RLS
ALTER TABLE public.recurrence_definitions ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
CREATE POLICY "Users can view recurrence definitions in own company"
ON public.recurrence_definitions FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can insert recurrence definitions"
ON public.recurrence_definitions FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update recurrence definitions"
ON public.recurrence_definitions FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete non-system recurrence definitions"
ON public.recurrence_definitions FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role) AND is_system = false);

-- Step 5: Seed default definitions for all existing companies
INSERT INTO public.recurrence_definitions (company_id, name, key, interval_value, interval_unit, max_span_days, is_system)
SELECT c.id, d.name, d.key, d.interval_value, d.interval_unit, d.max_span_days, true
FROM public.companies c
CROSS JOIN (VALUES
  ('Nenhuma', 'none', 0, 'day'::interval_unit, 0),
  ('Diária', 'daily', 1, 'day'::interval_unit, 1),
  ('Semanal', 'weekly', 1, 'week'::interval_unit, 7),
  ('Mensal', 'monthly', 1, 'month'::interval_unit, 30),
  ('Anual', 'yearly', 1, 'year'::interval_unit, 365)
) AS d(name, key, interval_value, interval_unit, max_span_days);

-- Step 6: Convert tasks.recurrence_type from enum to text
ALTER TABLE public.tasks ALTER COLUMN recurrence_type DROP DEFAULT;
ALTER TABLE public.tasks ALTER COLUMN recurrence_type TYPE text USING recurrence_type::text;
ALTER TABLE public.tasks ALTER COLUMN recurrence_type SET DEFAULT 'none';

-- Step 7: Drop the old enum (no longer needed)
DROP TYPE public.recurrence_type;
