import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { nowAsFakeUTC } from "@/lib/date-utils";

type Task = Tables<"tasks">;

/**
 * Updates a task status. No longer auto-generates recurring tasks.
 * Returns `isRecurring: true` when the completed task is recurring,
 * so the caller can prompt the user before generating the next instance.
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: "pending" | "in_progress" | "completed" | "overdue" | "not_done",
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
        created_at: nowAsFakeUTC(),
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

/**
 * Marks a task as "not done" and creates a log entry.
 */
export interface MarkNotDoneParams {
  taskId: string;
  userId: string;
  reason?: string;
  originalDueDate: string;
  nextAction?: "generate_next" | "reschedule" | "just_mark";
  newDueDate?: string;
}

export async function markTaskAsNotDone(params: MarkNotDoneParams) {
  const { taskId, userId, reason, originalDueDate, nextAction = "just_mark", newDueDate } = params;

  // Update task status to not_done
  const { error: updateErr } = await supabase
    .from("tasks")
    .update({ status: "not_done" as any })
    .eq("id", taskId);
  if (updateErr) throw updateErr;

  // Create log
  const { error: logErr } = await supabase
    .from("task_not_done_logs" as any)
    .insert({
      task_id: taskId,
      user_id: userId,
      reason: reason || null,
      auto_generated: false,
      original_due_date: originalDueDate,
      next_action: nextAction === "generate_next" ? "Gerar próxima" : nextAction === "reschedule" ? "Remarcada" : "Apenas marcada",
    });
  if (logErr) throw logErr;

  // If rescheduling, update due_date and reset status to pending
  if (nextAction === "reschedule" && newDueDate) {
    const { error: rescheduleErr } = await supabase
      .from("tasks")
      .update({ status: "pending" as any, due_date: newDueDate })
      .eq("id", taskId);
    if (rescheduleErr) throw rescheduleErr;
  }

  return { nextAction };
}

/**
 * Resolves a not_done task: reschedule, complete late, or generate next recurrence.
 */
export async function resolveNotDoneTask(
  taskId: string,
  action: "reschedule" | "complete_late" | "generate_next",
  params?: { newDueDate?: string; reason?: string }
) {
  if (action === "reschedule" && params?.newDueDate) {
    // Update the log
    await supabase
      .from("task_not_done_logs" as any)
      .update({ next_action: "Remarcada" })
      .eq("task_id", taskId)
      .eq("next_action", "Aguardando ação do usuário");

    // Reschedule the task
    const { error } = await supabase
      .from("tasks")
      .update({ status: "pending" as any, due_date: params.newDueDate })
      .eq("id", taskId);
    if (error) throw error;
  } else if (action === "complete_late") {
    await supabase
      .from("task_not_done_logs" as any)
      .update({ next_action: "Concluída com atraso" })
      .eq("task_id", taskId)
      .eq("next_action", "Aguardando ação do usuário");

    const { error } = await supabase
      .from("tasks")
      .update({ status: "completed" as any })
      .eq("id", taskId);
    if (error) throw error;
  } else if (action === "generate_next") {
    await supabase
      .from("task_not_done_logs" as any)
      .update({ next_action: "Próxima gerada" })
      .eq("task_id", taskId)
      .eq("next_action", "Aguardando ação do usuário");

    // Keep as not_done, generate next recurrence
  }
}
