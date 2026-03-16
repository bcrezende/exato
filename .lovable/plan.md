

## Sistema de Notificações Internas

### Visão geral
Criar um sistema de notificações in-app que avisa os usuários sobre eventos relevantes (tarefa atribuída, status alterado, etc.), com sino de notificação no header, popover com lista de notificações, e badge de contagem de não lidas. Usar Realtime para atualização instantânea.

### Alterações

**1. Nova tabela `notifications` (migração)**
```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'task_assigned',
  reference_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read) WHERE read = false;
```

- `type`: `task_assigned`, `task_completed`, `task_status_changed`, `task_comment`
- `reference_id`: link para a tarefa relacionada

**2. Trigger no banco para gerar notificações automaticamente**

Criar uma function + trigger na tabela `tasks` que gera notificação quando:
- `assigned_to` é definido ou alterado (INSERT/UPDATE) → notifica o `assigned_to`
- Status muda → notifica o `assigned_to` (se diferente de quem fez a mudança)

```sql
CREATE OR REPLACE FUNCTION public.notify_task_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  -- Tarefa atribuída (nova ou mudou assigned_to)
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NEW.assigned_to, 'Nova tarefa atribuída', NEW.title, 'task_assigned', NEW.id);
  END IF;

  -- Status alterado (notificar assigned_to se não foi ele que alterou)
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NEW.assigned_to, 'Status da tarefa alterado', NEW.title || ' → ' || NEW.status, 'task_status_changed', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_task_changes
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_changes();
```

**3. Novo componente `src/components/NotificationBell.tsx`**
- Ícone de sino (lucide `Bell`) no header do `AppLayout`
- Badge com contagem de não lidas
- Popover com lista de notificações recentes
- Botão "Marcar todas como lidas"
- Clique em notificação → marca como lida + navega para `/tasks` (futuro: abrir tarefa específica)
- Usa Realtime para receber novas notificações instantaneamente

**4. `src/components/AppLayout.tsx`** — Adicionar `<NotificationBell />` no header ao lado do `SidebarTrigger`

### Arquivos alterados/criados
- Migração SQL — tabela `notifications` + trigger `notify_task_changes`
- `src/components/NotificationBell.tsx` — novo componente
- `src/components/AppLayout.tsx` — adicionar sino no header

