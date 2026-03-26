DROP POLICY IF EXISTS "Authenticated can insert delays" ON task_delays;

CREATE POLICY "Service role can insert delays"
ON public.task_delays FOR INSERT
WITH CHECK (auth.role() = 'service_role');