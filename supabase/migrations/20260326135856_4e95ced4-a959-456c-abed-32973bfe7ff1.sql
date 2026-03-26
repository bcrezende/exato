
-- Fix 1: Restrict profile self-update to safe columns only (prevent is_master, company_id, department_id escalation)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND is_master IS NOT DISTINCT FROM (SELECT p.is_master FROM public.profiles p WHERE p.id = auth.uid())
  AND company_id IS NOT DISTINCT FROM (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
  AND department_id IS NOT DISTINCT FROM (SELECT p.department_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- Fix 2: Restrict notification inserts to service_role only (trigger notify_task_changes uses SECURITY DEFINER)
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'service_role');
