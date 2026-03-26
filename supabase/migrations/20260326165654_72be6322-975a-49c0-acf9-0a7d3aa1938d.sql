
-- Function 1: Get email stats (deduplicated by message_id)
CREATE OR REPLACE FUNCTION public.get_email_stats(
  _start timestamptz,
  _end timestamptz,
  _template text DEFAULT NULL,
  _status text DEFAULT NULL
)
RETURNS TABLE(status text, count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT latest.status, COUNT(*)::bigint
  FROM (
    SELECT DISTINCT ON (esl.message_id) esl.status, esl.created_at, esl.template_name
    FROM email_send_log esl
    WHERE esl.message_id IS NOT NULL
    ORDER BY esl.message_id, esl.created_at DESC
  ) latest
  WHERE latest.created_at >= _start
    AND latest.created_at <= _end
    AND (_template IS NULL OR latest.template_name = _template)
    AND (_status IS NULL OR latest.status = _status)
  GROUP BY latest.status;
END;
$$;

-- Function 2: Get email logs (deduplicated, paginated)
CREATE OR REPLACE FUNCTION public.get_email_logs(
  _start timestamptz,
  _end timestamptz,
  _template text DEFAULT NULL,
  _status text DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE(message_id text, template_name text, recipient_email text, status text, error_message text, created_at timestamptz, metadata jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT latest.message_id, latest.template_name, latest.recipient_email,
         latest.status, latest.error_message, latest.created_at, latest.metadata
  FROM (
    SELECT DISTINCT ON (esl.message_id)
      esl.message_id, esl.template_name, esl.recipient_email,
      esl.status, esl.error_message, esl.created_at, esl.metadata
    FROM email_send_log esl
    WHERE esl.message_id IS NOT NULL
    ORDER BY esl.message_id, esl.created_at DESC
  ) latest
  WHERE latest.created_at >= _start
    AND latest.created_at <= _end
    AND (_template IS NULL OR latest.template_name = _template)
    AND (_status IS NULL OR latest.status = _status)
  ORDER BY latest.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

-- Function 3: Get distinct template names
CREATE OR REPLACE FUNCTION public.get_email_templates()
RETURNS TABLE(template_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT DISTINCT esl.template_name
  FROM email_send_log esl
  ORDER BY esl.template_name;
END;
$$;
