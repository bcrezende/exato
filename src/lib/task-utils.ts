import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

/**
 * Updates a task status. No longer auto-generates recurring tasks.
 * Returns `isRecurring: true` when the completed task is recurring,
 * so the caller can prompt the user before generating the next instance.
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: "pending" | "in_progress" | "completed" | "overdue",
  task?: Pick<Task, "recurrence_parent_id" | "recurrence_type" | "status"> | null,
  difficultyRating?: number | null
) {
  const previousStatus = task?.status;

  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (newStatus === "completed" && difficultyRating) {
    updatePayload.difficulty_rating = difficultyRating;
  }
  const { error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId);

  if (error) throw error;

  // Fire-and-forget: time log
  if (newStatus === "in_progress" || newStatus === "completed") {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) {
      let action: string;
      if (newStatus === "in_progress") {
        action = previousStatus === "overdue" ? "started_late" : "started";
      } else {
        action = "completed";
      }
      supabase.from("task_time_logs").insert({
        task_id: taskId,
        user_id: userId,
        action,
      }).then(() => {});
    }
  }

  // Check if recurring — return flag instead of auto-generating
  const isRecurring =
    newStatus === "completed" &&
    !!(task?.recurrence_parent_id || (task?.recurrence_type && task.recurrence_type !== "none"));

  const parentId = isRecurring
    ? (task?.recurrence_parent_id || taskId)
    : null;

  return { error: null, isRecurring, parentId };
}

/**
 * Generates the next recurring task instance by invoking the Edge Function.
 */
export async function generateNextRecurrence(parentId: string) {
  const { error } = await supabase.functions.invoke("generate-recurring-tasks", {
    body: { parentId },
  });
  if (error) throw new Error(`Edge function error: ${error.message || error}`);
}
