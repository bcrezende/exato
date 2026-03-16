
DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
