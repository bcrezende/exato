
-- Add new columns to recurrence_definitions
ALTER TABLE public.recurrence_definitions
  ADD COLUMN weekdays integer[] DEFAULT NULL,
  ADD COLUMN skip_weekends boolean NOT NULL DEFAULT false,
  ADD COLUMN skip_holidays boolean NOT NULL DEFAULT false;

-- Create company_holidays table
CREATE TABLE public.company_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  holiday_date date NOT NULL,
  is_recurring boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (company_id, holiday_date)
);

ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- RLS: all company users can SELECT
CREATE POLICY "Users can view holidays in own company"
  ON public.company_holidays FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- RLS: admins can INSERT
CREATE POLICY "Admins can insert holidays"
  ON public.company_holidays FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- RLS: admins can UPDATE
CREATE POLICY "Admins can update holidays"
  ON public.company_holidays FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- RLS: admins can DELETE
CREATE POLICY "Admins can delete holidays"
  ON public.company_holidays FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));
