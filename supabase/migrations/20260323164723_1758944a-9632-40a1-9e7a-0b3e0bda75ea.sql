
ALTER TABLE public.task_attachments
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Storage policies for task-attachments bucket
CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can read task attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments');

CREATE POLICY "Users can delete own task attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments');

-- Allow admins to delete any attachment
DROP POLICY IF EXISTS "Users can delete own attachments" ON public.task_attachments;
CREATE POLICY "Users or admins can delete attachments"
ON public.task_attachments FOR DELETE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
