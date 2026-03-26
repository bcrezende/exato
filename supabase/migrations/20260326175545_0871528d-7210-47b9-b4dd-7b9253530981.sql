
CREATE TABLE public.email_template_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL UNIQUE,
  subject_override text,
  heading_override text,
  body_override text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.email_template_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master can read overrides"
ON public.email_template_overrides FOR SELECT TO authenticated
USING (is_master(auth.uid()));

CREATE POLICY "Master can insert overrides"
ON public.email_template_overrides FOR INSERT TO authenticated
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Master can update overrides"
ON public.email_template_overrides FOR UPDATE TO authenticated
USING (is_master(auth.uid()));

CREATE POLICY "Master can delete overrides"
ON public.email_template_overrides FOR DELETE TO authenticated
USING (is_master(auth.uid()));

CREATE POLICY "Service role can read overrides"
ON public.email_template_overrides FOR SELECT
USING (auth.role() = 'service_role'::text);
