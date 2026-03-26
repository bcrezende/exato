
-- 1. Add is_master column to profiles
ALTER TABLE public.profiles ADD COLUMN is_master boolean NOT NULL DEFAULT false;

-- 2. Create security definer function
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_master FROM public.profiles WHERE id = _user_id), false)
$$;

-- 3. Make company_id nullable in changelog_entries
ALTER TABLE public.changelog_entries ALTER COLUMN company_id DROP NOT NULL;

-- 4. Drop old RLS policies
DROP POLICY IF EXISTS "Admins can insert changelog entries" ON public.changelog_entries;
DROP POLICY IF EXISTS "Admins can update changelog entries" ON public.changelog_entries;
DROP POLICY IF EXISTS "Admins can delete changelog entries" ON public.changelog_entries;
DROP POLICY IF EXISTS "Users can view changelog entries in own company" ON public.changelog_entries;

-- 5. Create new global RLS policies
CREATE POLICY "Anyone authenticated can view changelog"
  ON public.changelog_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Masters can insert changelog"
  ON public.changelog_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Masters can update changelog"
  ON public.changelog_entries FOR UPDATE TO authenticated
  USING (public.is_master(auth.uid()));

CREATE POLICY "Masters can delete changelog"
  ON public.changelog_entries FOR DELETE TO authenticated
  USING (public.is_master(auth.uid()));

-- 6. Update trigger for global reset
CREATE OR REPLACE FUNCTION public.reset_dismiss_whats_new()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    UPDATE public.profiles SET dismiss_whats_new = false;
  ELSE
    UPDATE public.profiles SET dismiss_whats_new = false WHERE company_id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;
