
CREATE TABLE public.analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_label TEXT,
  sector_name TEXT,
  employee_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view analysis history"
  ON public.analysis_history FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins and managers can insert analysis"
  ON public.analysis_history FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins and managers can delete analysis"
  ON public.analysis_history FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );
