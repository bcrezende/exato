import { supabase } from "@/integrations/supabase/client";

export type AnalysisType = "productivity" | "bottlenecks" | "team" | "risks";

export const analysisTypeLabels: Record<AnalysisType, string> = {
  productivity: "Produtividade",
  bottlenecks: "Gargalos",
  team: "Equipe",
  risks: "Riscos",
};

export interface AnalysisMetrics {
  totalTasks: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
  delayRate: number;
  avgExecutionMinutes: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  topSlowTasks: { title: string; minutes: number }[];
  avgEstimateDeviation: number | null;
  topDeviations: { title: string; estimated: number; actual: number; deviation: number }[];
  avgDifficulty: string | null;
  difficultyDistribution: { rating: number; count: number }[];
  hardestTasks: { title: string; difficulty: number }[];
}

export async function fetchMetricsForPeriod(
  startDate: string,
  endDate: string,
  sectorId: string,
  employeeId: string,
): Promise<AnalysisMetrics> {
  let tasksQuery = supabase
    .from("tasks")
    .select("id, title, status, priority, due_date, start_date, assigned_to, department_id, estimated_minutes, created_at, difficulty_rating")
    .gte("created_at", startDate)
    .lte("created_at", endDate);
  if (sectorId !== "all") tasksQuery = tasksQuery.eq("department_id", sectorId);
  if (employeeId !== "all") tasksQuery = tasksQuery.eq("assigned_to", employeeId);
  const { data: tasks } = await tasksQuery;

  const { data: timeLogs } = await supabase
    .from("task_time_logs")
    .select("id, task_id, user_id, action, created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  const taskList = tasks || [];
  const logList = timeLogs || [];
  const now = new Date();

  const completed = taskList.filter((t) => t.status === "completed").length;
  const pending = taskList.filter((t) => t.status === "pending").length;
  const inProgress = taskList.filter((t) => t.status === "in_progress").length;
  const overdue = taskList.filter((t) => t.status === "overdue" || (!["completed", "in_progress"].includes(t.status) && t.due_date && t.due_date < now.toISOString())).length;
  const totalTasks = taskList.length;
  const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
  const delayRate = totalTasks > 0 ? Math.round((overdue / totalTasks) * 100) : 0;

  const highPriority = taskList.filter((t) => t.priority === "high").length;
  const mediumPriority = taskList.filter((t) => t.priority === "medium").length;
  const lowPriority = taskList.filter((t) => t.priority === "low").length;

  const taskLogMap = new Map<string, { start?: string; end?: string }>();
  logList.forEach((l) => {
    if (!taskLogMap.has(l.task_id)) taskLogMap.set(l.task_id, {});
    const entry = taskLogMap.get(l.task_id)!;
    if (l.action === "start") entry.start = l.created_at;
    if (l.action === "complete") entry.end = l.created_at;
  });

  const durations: { taskId: string; minutes: number; title: string }[] = [];
  taskLogMap.forEach((v, taskId) => {
    if (v.start && v.end) {
      const mins = Math.round((new Date(v.end).getTime() - new Date(v.start).getTime()) / 60000);
      const task = taskList.find((t) => t.id === taskId);
      durations.push({ taskId, minutes: mins, title: task?.title || "Sem título" });
    }
  });

  const avgExecutionMinutes = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d.minutes, 0) / durations.length) : 0;
  const topSlowTasks = [...durations].sort((a, b) => b.minutes - a.minutes).slice(0, 3).map(t => ({ title: t.title, minutes: t.minutes }));

  const tasksWithEstimate = taskList.filter((t: any) => t.estimated_minutes && t.estimated_minutes > 0);
  const estimateDeviations: { title: string; estimated: number; actual: number; deviation: number }[] = [];
  tasksWithEstimate.forEach((t: any) => {
    const dur = durations.find(d => d.taskId === t.id);
    if (dur) {
      const dev = dur.minutes - t.estimated_minutes;
      estimateDeviations.push({ title: t.title, estimated: t.estimated_minutes, actual: dur.minutes, deviation: dev });
    }
  });
  const avgEstimateDeviation = estimateDeviations.length > 0
    ? Math.round(estimateDeviations.reduce((s, d) => s + d.deviation, 0) / estimateDeviations.length)
    : null;
  const topDeviations = [...estimateDeviations].sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)).slice(0, 3);

  const tasksWithDifficulty = taskList.filter((t: any) => t.difficulty_rating && t.difficulty_rating > 0);
  const avgDifficulty = tasksWithDifficulty.length > 0
    ? (tasksWithDifficulty.reduce((s: number, t: any) => s + t.difficulty_rating, 0) / tasksWithDifficulty.length).toFixed(1)
    : null;
  const difficultyDistribution = [1, 2, 3, 4, 5].map(r => ({
    rating: r,
    count: tasksWithDifficulty.filter((t: any) => t.difficulty_rating === r).length,
  }));
  const hardestTasks = [...tasksWithDifficulty].sort((a: any, b: any) => b.difficulty_rating - a.difficulty_rating).slice(0, 3).map((t: any) => ({ title: t.title, difficulty: t.difficulty_rating }));

  return {
    totalTasks, completed, pending, inProgress, overdue,
    completionRate, delayRate, avgExecutionMinutes,
    highPriority, mediumPriority, lowPriority,
    topSlowTasks, avgEstimateDeviation, topDeviations,
    avgDifficulty, difficultyDistribution, hardestTasks,
  };
}

export function getPreviousPeriodDates(startDate: Date, endDate: Date): { start: Date; end: Date } {
  const durationMs = endDate.getTime() - startDate.getTime();
  return {
    start: new Date(startDate.getTime() - durationMs),
    end: new Date(startDate.getTime()),
  };
}
