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

  // If completing a recurring task instance, await generation of next instance
  let generatedRecurring = false;
  if (
    newStatus === "completed" &&
    (task?.recurrence_parent_id || (task?.recurrence_type && task.recurrence_type !== "none"))
  ) {
    try {
      await supabase.functions.invoke("generate-recurring-tasks");
      generatedRecurring = true;
    } catch (err) {
      console.error("Error triggering recurring task generation:", err);
    }
  }

  return { error: null, generatedRecurring };
}
