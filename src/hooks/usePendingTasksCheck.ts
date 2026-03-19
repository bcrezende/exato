import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type PendingTask = Pick<Tables<"tasks">, "id" | "title" | "due_date" | "start_date" | "status">;

interface UsePendingTasksCheckReturn {
  checkBeforeStart: (taskId: string, onProceed: () => void) => Promise<void>;
  pendingTasks: PendingTask[];
  isAlertOpen: boolean;
  closeAlert: () => void;
  proceedAction: (() => void) | null;
}

export function usePendingTasksCheck(): UsePendingTasksCheckReturn {
  const { user, profile } = useAuth();
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [proceedAction, setProceedAction] = useState<(() => void) | null>(null);

  const checkBeforeStart = useCallback(async (taskId: string, onProceed: () => void) => {
    if (!user) { onProceed(); return; }

    // Check if user dismissed warnings
    const dismissWarnings = (profile as any)?.dismiss_pending_warnings === true;
    if (dismissWarnings) { onProceed(); return; }

    const now = new Date();
    const todayStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T00:00:00+00:00`;

    const { data } = await supabase
      .from("tasks")
      .select("id, title, due_date, start_date, status")
      .eq("assigned_to", user.id)
      .in("status", ["pending", "in_progress", "overdue"])
      .neq("id", taskId)
      .or(`due_date.lt.${todayStart},start_date.lt.${todayStart}`)
      .order("due_date", { ascending: true })
      .limit(10);

    if (data && data.length > 0) {
      setPendingTasks(data);
      setProceedAction(() => onProceed);
      setIsAlertOpen(true);
    } else {
      onProceed();
    }
  }, [user, profile]);

  const closeAlert = useCallback(() => {
    setIsAlertOpen(false);
    setPendingTasks([]);
    setProceedAction(null);
  }, []);

  return { checkBeforeStart, pendingTasks, isAlertOpen, closeAlert, proceedAction };
}
