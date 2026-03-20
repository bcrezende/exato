
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON public.tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON public.task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_created_at ON public.task_time_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_task_delays_created_at ON public.task_delays(created_at);
CREATE INDEX IF NOT EXISTS idx_task_delays_task_id ON public.task_delays(task_id);
