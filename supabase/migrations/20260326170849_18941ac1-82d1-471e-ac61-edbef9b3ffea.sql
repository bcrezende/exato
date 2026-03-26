
-- 1. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  user_name text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS - INSERT only service_role
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read audit logs"
ON public.audit_logs FOR SELECT
USING (auth.role() = 'service_role');

-- 3. Indexes
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);

-- 4. Trigger function for task changes
CREATE OR REPLACE FUNCTION public.audit_task_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _user_email text;
  _user_name text;
  _action text;
  _meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _user_id := NEW.created_by;
    _action := 'task_created';
    _meta := jsonb_build_object('title', NEW.title, 'status', NEW.status, 'assigned_to', NEW.assigned_to);

    SELECT p.full_name, u.email INTO _user_name, _user_email
    FROM profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.id = _user_id;

    INSERT INTO audit_logs (user_id, user_email, user_name, action, entity_type, entity_id, metadata)
    VALUES (_user_id, _user_email, _user_name, _action, 'task', NEW.id, _meta);

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    _user_id := COALESCE(NEW.assigned_to, NEW.created_by);
    _action := 'task_status_changed';
    _meta := jsonb_build_object('title', NEW.title, 'old_status', OLD.status, 'new_status', NEW.status);

    SELECT p.full_name, u.email INTO _user_name, _user_email
    FROM profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.id = _user_id;

    INSERT INTO audit_logs (user_id, user_email, user_name, action, entity_type, entity_id, metadata)
    VALUES (_user_id, _user_email, _user_name, _action, 'task', NEW.id, _meta);

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    _user_id := OLD.created_by;
    _action := 'task_deleted';
    _meta := jsonb_build_object('title', OLD.title, 'status', OLD.status);

    SELECT p.full_name, u.email INTO _user_name, _user_email
    FROM profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.id = _user_id;

    INSERT INTO audit_logs (user_id, user_email, user_name, action, entity_type, entity_id, metadata)
    VALUES (_user_id, _user_email, _user_name, _action, 'task', OLD.id, _meta);

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_task_changes
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.audit_task_changes();

-- 5. RPC: log_audit_event (for login events from frontend)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid;
  _email text;
  _name text;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.full_name, u.email INTO _name, _email
  FROM profiles p JOIN auth.users u ON u.id = p.id
  WHERE p.id = _uid;

  INSERT INTO audit_logs (user_id, user_email, user_name, action, entity_type, entity_id, metadata)
  VALUES (_uid, _email, _name, _action, _entity_type, _entity_id, _metadata);
END;
$$;

-- 6. RPC: get_audit_logs (master only)
CREATE OR REPLACE FUNCTION public.get_audit_logs(
  _start timestamptz,
  _end timestamptz,
  _action text DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_email text,
  user_name text,
  action text,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT al.id, al.user_id, al.user_email, al.user_name,
         al.action, al.entity_type, al.entity_id, al.metadata, al.created_at
  FROM audit_logs al
  WHERE al.created_at >= _start
    AND al.created_at <= _end
    AND (_action IS NULL OR al.action = _action)
    AND (_user_id IS NULL OR al.user_id = _user_id)
  ORDER BY al.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

-- 7. RPC: get_audit_stats (master only)
CREATE OR REPLACE FUNCTION public.get_audit_stats(
  _start timestamptz,
  _end timestamptz
)
RETURNS TABLE(action text, count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT al.action, COUNT(*)::bigint
  FROM audit_logs al
  WHERE al.created_at >= _start
    AND al.created_at <= _end
  GROUP BY al.action;
END;
$$;
