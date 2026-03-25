
-- Create enum for changelog categories
CREATE TYPE public.changelog_category AS ENUM ('feature', 'improvement', 'fix', 'announcement');

-- Create changelog_entries table
CREATE TABLE public.changelog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category public.changelog_category NOT NULL DEFAULT 'feature',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create changelog_reads table
CREATE TABLE public.changelog_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changelog_id uuid NOT NULL REFERENCES public.changelog_entries(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, changelog_id)
);

-- Enable RLS
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog_reads ENABLE ROW LEVEL SECURITY;

-- RLS for changelog_entries
CREATE POLICY "Users can view changelog entries in own company"
  ON public.changelog_entries FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can insert changelog entries"
  ON public.changelog_entries FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update changelog entries"
  ON public.changelog_entries FOR UPDATE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete changelog entries"
  ON public.changelog_entries FOR DELETE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS for changelog_reads
CREATE POLICY "Users can view own reads"
  ON public.changelog_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reads"
  ON public.changelog_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for changelog_entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.changelog_entries;
