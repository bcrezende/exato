import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveNotDoneTask, generateNextRecurrence } from "@/lib/task-utils";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

export interface UsePendingNotDoneReturn {
  notDoneTasks: Task[];
  isLoading: boolean;
  showModal: boolean;
  resolveTask: (
    taskId: string,
    action: "reschedule" | "complete_late" | "generate_next",
    params?: { newDueDate?: string; parentId?: string }
  ) => Promise<void>;
  refetch: () => void;
}

export function usePendingNotDone(): UsePendingNotDoneReturn {
  const { user } = useAuth();
  const [notDoneTasks, setNotDoneTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchNotDone = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }

    // First get pending log task_ids
    const { data: logs } = await supabase
      .from("task_not_done_logs" as any)
      .select("task_id")
      .eq("user_id", user.id)
      .eq("next_action", "Aguardando ação do usuário");

    if (!logs || logs.length === 0) {
      setNotDoneTasks([]);
      setShowModal(false);
      setIsLoading(false);
      return;
    }

    const taskIds = (logs as any[]).map((l: any) => l.task_id);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .in("id", taskIds)
      .eq("status", "not_done" as any);

    if (tasks && tasks.length > 0) {
      setNotDoneTasks(tasks);
      setShowModal(true);
    } else {
      setNotDoneTasks([]);
      setShowModal(false);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotDone();
  }, [fetchNotDone]);

  const resolveTask = useCallback(async (
    taskId: string,
    action: "reschedule" | "complete_late" | "generate_next",
    params?: { newDueDate?: string; parentId?: string }
  ) => {
    await resolveNotDoneTask(taskId, action, { newDueDate: params?.newDueDate });

    if (action === "generate_next" && params?.parentId) {
      await generateNextRecurrence(params.parentId);
    }

    // Remove from local state
    setNotDoneTasks(prev => {
      const updated = prev.filter(t => t.id !== taskId);
      if (updated.length === 0) setShowModal(false);
      return updated;
    });
  }, []);

  return { notDoneTasks, isLoading, showModal, resolveTask, refetch: fetchNotDone };
}
