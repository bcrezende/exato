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

  // Log time tracking events
  if (newStatus === "in_progress" || newStatus === "completed") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const action = newStatus === "in_progress" ? "started" : "completed";
      await supabase.from("task_time_logs").insert({
        task_id: taskId,
        user_id: user.id,
        action,
      });
    }
  }

  // If completing a recurring task instance, await generation of next instance
  let generatedRecurring = false;
  if (
    newStatus === "completed" &&
    (task?.recurrence_parent_id || (task?.recurrence_type && task.recurrence_type !== "none"))
  ) {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-recurring-tasks");
      if (fnError) {
        console.error("Edge function error:", fnError);
      } else {
        console.log("Recurring tasks response:", data);
        generatedRecurring = true;
      }
    } catch (err) {
      console.error("Error triggering recurring task generation:", err);
    }
  }

  return { error: null, generatedRecurring };
}
