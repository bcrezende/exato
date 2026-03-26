
-- Control table for sent notifications (prevents duplicates)
CREATE TABLE public.task_email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (task_id, notification_type)
);

ALTER TABLE public.task_email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage task_email_notifications"
  ON public.task_email_notifications FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- User notification preferences
CREATE TABLE public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reminder_5min BOOLEAN DEFAULT TRUE,
  late_start BOOLEAN DEFAULT TRUE,
  overdue BOOLEAN DEFAULT TRUE,
  in_progress_overdue BOOLEAN DEFAULT TRUE,
  previous_day_unstarted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON public.user_notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON public.user_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON public.user_notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can read notification preferences"
  ON public.user_notification_preferences FOR SELECT
  USING (auth.role() = 'service_role'::text);
