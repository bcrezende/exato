
-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.recurrence_type AS ENUM ('none', 'daily', 'weekly', 'monthly', 'yearly');

-- Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  recurrence_type recurrence_type NOT NULL DEFAULT 'none',
  recurrence_parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Task comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Task attachments table
CREATE TABLE public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Invitations table
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false);

-- Security definer function for role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's company_id (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id
$$;

-- Get user's department_id (security definer)
CREATE OR REPLACE FUNCTION public.get_user_department_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = _user_id
$$;

-- Trigger function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RLS POLICIES =====

-- Companies: users can see their own company
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT USING (id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Admins can update own company" ON public.companies
  FOR UPDATE USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create a company on signup" ON public.companies
  FOR INSERT WITH CHECK (true);

-- Departments: same company
CREATE POLICY "Users can view departments in own company" ON public.departments
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Admins can manage departments" ON public.departments
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update departments" ON public.departments
  FOR UPDATE USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete departments" ON public.departments
  FOR DELETE USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Profiles: users see own company profiles
CREATE POLICY "Users can view profiles in own company" ON public.profiles
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()) OR id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "System can create profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- User roles
CREATE POLICY "Users can view roles in own company" ON public.user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = user_roles.user_id 
      AND p.company_id = public.get_user_company_id(auth.uid())
    )
    OR user_id = auth.uid()
  );
CREATE POLICY "Admins and managers can manage roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Tasks: based on role
CREATE POLICY "Users can view tasks" ON public.tasks
  FOR SELECT USING (
    company_id = public.get_user_company_id(auth.uid()) AND (
      public.has_role(auth.uid(), 'admin')
      OR (public.has_role(auth.uid(), 'manager') AND department_id = public.get_user_department_id(auth.uid()))
      OR assigned_to = auth.uid()
    )
  );
CREATE POLICY "Admins and managers can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id(auth.uid()) AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
    )
  );
CREATE POLICY "Task creators and admins can update tasks" ON public.tasks
  FOR UPDATE USING (
    company_id = public.get_user_company_id(auth.uid()) AND (
      public.has_role(auth.uid(), 'admin')
      OR created_by = auth.uid()
      OR assigned_to = auth.uid()
    )
  );
CREATE POLICY "Admins and creators can delete tasks" ON public.tasks
  FOR DELETE USING (
    company_id = public.get_user_company_id(auth.uid()) AND (
      public.has_role(auth.uid(), 'admin') OR created_by = auth.uid()
    )
  );

-- Task comments
CREATE POLICY "Users can view task comments" ON public.task_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (
      t.assigned_to = auth.uid() OR t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
      OR (public.has_role(auth.uid(), 'manager') AND t.department_id = public.get_user_department_id(auth.uid()))
    ))
  );
CREATE POLICY "Users can create comments on accessible tasks" ON public.task_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON public.task_comments
  FOR DELETE USING (user_id = auth.uid());

-- Task attachments
CREATE POLICY "Users can view task attachments" ON public.task_attachments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (
      t.assigned_to = auth.uid() OR t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
      OR (public.has_role(auth.uid(), 'manager') AND t.department_id = public.get_user_department_id(auth.uid()))
    ))
  );
CREATE POLICY "Users can upload attachments" ON public.task_attachments
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own attachments" ON public.task_attachments
  FOR DELETE USING (user_id = auth.uid());

-- Invitations
CREATE POLICY "Admins and managers can view invitations" ON public.invitations
  FOR SELECT USING (
    company_id = public.get_user_company_id(auth.uid()) AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
    )
  );
CREATE POLICY "Admins and managers can create invitations" ON public.invitations
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id(auth.uid()) AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
    )
  );
CREATE POLICY "Admins can delete invitations" ON public.invitations
  FOR DELETE USING (
    company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Anyone can view invitation by token" ON public.invitations
  FOR SELECT USING (accepted_at IS NULL);
CREATE POLICY "Anyone can update invitation to accept" ON public.invitations
  FOR UPDATE USING (accepted_at IS NULL);

-- Storage policies for task-attachments bucket
CREATE POLICY "Users can upload to task-attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view task attachments files" ON storage.objects
  FOR SELECT USING (bucket_id = 'task-attachments');
CREATE POLICY "Users can delete own attachment files" ON storage.objects
  FOR DELETE USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
