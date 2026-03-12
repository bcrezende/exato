import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

/**
 * Updates a task status and, if the task is a recurring instance being completed,
 * triggers the edge function to immediately generate the next instance.
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: "pending" | "in_progress" | "completed" | "overdue",
  task?: Pick<Task, "recurrence_parent_id" | "recurrence_type"> | null
) {
  const { error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", taskId);

  if (error) throw error;

  // If completing a recurring task instance, trigger immediate generation of next instance
  if (
    newStatus === "completed" &&
    (task?.recurrence_parent_id || (task?.recurrence_type && task.recurrence_type !== "none"))
  ) {
    // Fire and forget — don't block the UI
    supabase.functions.invoke("generate-recurring-tasks").catch((err) => {
      console.error("Error triggering recurring task generation:", err);
    });
  }

  return { error: null };
}
