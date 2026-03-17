
-- Create coordinator_analysts relationship table
CREATE TABLE public.coordinator_analysts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id uuid NOT NULL,
  analyst_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coordinator_id, analyst_id)
);

ALTER TABLE public.coordinator_analysts ENABLE ROW LEVEL SECURITY;

-- Helper function - get analyst IDs for a coordinator
CREATE OR REPLACE FUNCTION public.get_coordinator_analyst_ids(_coordinator_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT analyst_id FROM public.coordinator_analysts
  WHERE coordinator_id = _coordinator_id
$$;

-- Helper function - check if user is coordinator of a specific analyst
CREATE OR REPLACE FUNCTION public.is_coordinator_of(_coordinator_id uuid, _analyst_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coordinator_analysts
    WHERE coordinator_id = _coordinator_id
      AND analyst_id = _analyst_id
  )
$$;

-- RLS policies for coordinator_analysts table
CREATE POLICY "Admins and managers can view all links"
ON public.coordinator_analysts FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Coordinators can view own links"
ON public.coordinator_analysts FOR SELECT
USING (coordinator_id = auth.uid());

CREATE POLICY "Admins and managers can insert links"
ON public.coordinator_analysts FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Admins and managers can delete links"
ON public.coordinator_analysts FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Admins and managers can update links"
ON public.coordinator_analysts FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

-- Update tasks policies
DROP POLICY IF EXISTS "Employees can create own tasks" ON public.tasks;
CREATE POLICY "Analysts can create own tasks"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
  AND assigned_to = auth.uid()
  AND has_role(auth.uid(), 'analyst')
);

DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
CREATE POLICY "Users can view tasks"
ON public.tasks FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin')
    OR (has_role(auth.uid(), 'manager') AND department_id = get_user_department_id(auth.uid()))
    OR (has_role(auth.uid(), 'coordinator') AND (
      assigned_to IN (SELECT public.get_coordinator_analyst_ids(auth.uid()))
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
    ))
    OR assigned_to = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins and managers can create tasks" ON public.tasks;
CREATE POLICY "Admins managers and coordinators can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager')
    OR (has_role(auth.uid(), 'coordinator') AND (
      assigned_to IN (SELECT public.get_coordinator_analyst_ids(auth.uid()))
      OR assigned_to = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "Task creators and admins can update tasks" ON public.tasks;
CREATE POLICY "Task creators admins and coordinators can update tasks"
ON public.tasks FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin')
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (has_role(auth.uid(), 'coordinator') AND assigned_to IN (SELECT public.get_coordinator_analyst_ids(auth.uid())))
  )
);

DROP POLICY IF EXISTS "Admins managers and creators can delete tasks" ON public.tasks;
CREATE POLICY "Admins managers coordinators and creators can delete tasks"
ON public.tasks FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin')
    OR created_by = auth.uid()
    OR (has_role(auth.uid(), 'manager') AND department_id = get_user_department_id(auth.uid()))
    OR (has_role(auth.uid(), 'coordinator') AND assigned_to IN (SELECT public.get_coordinator_analyst_ids(auth.uid())))
  )
);

-- Update task_attachments SELECT policy
DROP POLICY IF EXISTS "Users can view task attachments" ON public.task_attachments;
CREATE POLICY "Users can view task attachments"
ON public.task_attachments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.id = task_attachments.task_id
  AND (
    t.assigned_to = auth.uid()
    OR t.created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR (has_role(auth.uid(), 'manager') AND t.department_id = get_user_department_id(auth.uid()))
    OR (has_role(auth.uid(), 'coordinator') AND t.assigned_to IN (SELECT public.get_coordinator_analyst_ids(auth.uid())))
  )
));

-- Update task_comments SELECT policy
DROP POLICY IF EXISTS "Users can view task comments" ON public.task_comments;
CREATE POLICY "Users can view task comments"
ON public.task_comments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.id = task_comments.task_id
  AND (
    t.assigned_to = auth.uid()
    OR t.created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR (has_role(auth.uid(), 'manager') AND t.department_id = get_user_department_id(auth.uid()))
    OR (has_role(auth.uid(), 'coordinator') AND t.assigned_to IN (SELECT public.get_coordinator_analyst_ids(auth.uid())))
  )
));

-- Update analysis_history policies
DROP POLICY IF EXISTS "Admins and managers can view analysis history" ON public.analysis_history;
CREATE POLICY "Admins managers and coordinators can view analysis history"
ON public.analysis_history FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'coordinator'))
);

DROP POLICY IF EXISTS "Admins and managers can insert analysis" ON public.analysis_history;
CREATE POLICY "Admins managers and coordinators can insert analysis"
ON public.analysis_history FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'coordinator'))
);

DROP POLICY IF EXISTS "Admins and managers can delete analysis" ON public.analysis_history;
CREATE POLICY "Admins managers and coordinators can delete analysis"
ON public.analysis_history FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'coordinator'))
);

-- Update invitations policies
DROP POLICY IF EXISTS "Admins and managers can view invitations" ON public.invitations;
CREATE POLICY "Admins managers and coordinators can view invitations"
ON public.invitations FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'coordinator'))
);

DROP POLICY IF EXISTS "Admins and managers can create invitations" ON public.invitations;
CREATE POLICY "Admins managers and coordinators can create invitations"
ON public.invitations FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'coordinator'))
);

-- Update get_task_import_assignees to handle coordinator
CREATE OR REPLACE FUNCTION public.get_task_import_assignees()
RETURNS TABLE(profile_id uuid, email text, full_name text, department_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _company_id uuid;
  _department_id uuid;
  _is_admin boolean;
  _is_manager boolean;
  _is_coordinator boolean;
BEGIN
  _company_id := get_user_company_id(auth.uid());
  _department_id := get_user_department_id(auth.uid());
  _is_admin := has_role(auth.uid(), 'admin');
  _is_manager := has_role(auth.uid(), 'manager');
  _is_coordinator := has_role(auth.uid(), 'coordinator');

  IF _is_admin THEN
    RETURN QUERY
      SELECT p.id AS profile_id, u.email::text AS email, p.full_name, p.department_id
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.company_id = _company_id;
  ELSIF _is_manager THEN
    RETURN QUERY
      SELECT p.id AS profile_id, u.email::text AS email, p.full_name, p.department_id
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.company_id = _company_id AND p.department_id = _department_id;
  ELSIF _is_coordinator THEN
    RETURN QUERY
      SELECT p.id AS profile_id, u.email::text AS email, p.full_name, p.department_id
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.id IN (SELECT get_coordinator_analyst_ids(auth.uid()));
  ELSE
    RETURN;
  END IF;
END;
$function$;

-- Update invitations default role
ALTER TABLE public.invitations ALTER COLUMN role SET DEFAULT 'analyst'::app_role;
