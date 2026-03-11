
-- Fix the permissive INSERT policy on companies to only allow authenticated users
DROP POLICY "Anyone can create a company on signup" ON public.companies;
CREATE POLICY "Authenticated users can create a company" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- The profiles INSERT policy needs to stay permissive for the trigger, but restrict to own profile
DROP POLICY "System can create profiles" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
