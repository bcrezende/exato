-- Add DELETE policy for notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO public
USING (user_id = auth.uid());

-- Update trigger to translate status to Portuguese
CREATE OR REPLACE FUNCTION public.notify_task_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _status_label text;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NEW.assigned_to, 'Nova tarefa atribuída', NEW.title, 'task_assigned', NEW.id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.assigned_to IS NOT NULL THEN
    _status_label := CASE NEW.status::text
      WHEN 'pending' THEN 'Pendente'
      WHEN 'in_progress' THEN 'Em andamento'
      WHEN 'completed' THEN 'Concluída'
      WHEN 'overdue' THEN 'Atrasada'
      ELSE NEW.status::text
    END;

    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NEW.assigned_to, 'Status da tarefa alterado', NEW.title || ' → ' || _status_label, 'task_status_changed', NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;