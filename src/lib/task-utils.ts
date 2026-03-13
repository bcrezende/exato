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
  task?: Pick<Task, "recurrence_parent_id" | "recurrence_type" | "status"> | null
) {
  const previousStatus = task?.status;

  // 1. Essential: update status in DB
  const { error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", taskId);

  if (error) throw error;

  // 2. Fire-and-forget secondary operations (time log + recurring generation)
  const secondaryOps: Promise<unknown>[] = [];

  if (newStatus === "in_progress" || newStatus === "completed") {
    // Use getSession (reads from local cache) instead of getUser (network call)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) {
      let action: string;
      if (newStatus === "in_progress") {
        action = previousStatus === "overdue" ? "started_late" : "started";
      } else {
        action = "completed";
      }
      secondaryOps.push(
        supabase.from("task_time_logs").insert({
          task_id: taskId,
          user_id: userId,
          action,
        }).then(() => {})
      );
    }
  }

  let generatedRecurring = false;
  if (
    newStatus === "completed" &&
    (task?.recurrence_parent_id || (task?.recurrence_type && task.recurrence_type !== "none"))
  ) {
    secondaryOps.push(
      supabase.functions.invoke("generate-recurring-tasks").then(({ error: fnError }) => {
        if (fnError) console.error("Edge function error:", fnError);
        else generatedRecurring = true;
      }).catch(err => console.error("Error triggering recurring task generation:", err))
    );
  }

  // Don't block on secondary ops — fire them in parallel
  if (secondaryOps.length > 0) {
    Promise.all(secondaryOps).catch(console.error);
  }

  return { error: null, generatedRecurring };
}
