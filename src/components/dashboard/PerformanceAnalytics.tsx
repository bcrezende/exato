import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from "recharts";
import { Timer, TrendingDown, CheckCircle, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { format, subDays, startOfDay, differenceInMilliseconds } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type TimeLog = { id: string; task_id: string; user_id: string; action: string; created_at: string };
type Department = { id: string; name: string };

interface PerformanceAnalyticsProps {
  tasks: Task[];
  timeLogs: TimeLog[];
  departments: Department[];
  selectedDepartment: string | null;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0min";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export default function PerformanceAnalytics({ tasks, timeLogs, departments, selectedDepartment }: PerformanceAnalyticsProps) {
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const { toast } = useToast();

  const filteredTasks = useMemo(() => {
    if (!selectedDepartment) return tasks;
    return tasks.filter((t) => t.department_id === selectedDepartment);
  }, [tasks, selectedDepartment]);

  const filteredTaskIds = useMemo(() => new Set(filteredTasks.map((t) => t.id)), [filteredTasks]);
  const filteredLogs = useMemo(() => timeLogs.filter((l) => filteredTaskIds.has(l.task_id)), [timeLogs, filteredTaskIds]);

  // Build task->department map
  const taskDeptMap = useMemo(() => {
    const map = new Map<string, string | null>();
    tasks.forEach((t) => map.set(t.id, t.department_id));
    return map;
  }, [tasks]);

  const deptNameMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  // Calculate execution times per task (started/started_late -> completed)
  const executionData = useMemo(() => {
    const logsByTask = new Map<string, TimeLog[]>();
    filteredLogs.forEach((l) => {
      if (!logsByTask.has(l.task_id)) logsByTask.set(l.task_id, []);
      logsByTask.get(l.task_id)!.push(l);
    });

    const results: { taskId: string; deptId: string | null; duration: number; startedLate: boolean }[] = [];

    logsByTask.forEach((logs, taskId) => {
      const sorted = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const startLog = sorted.find((l) => l.action === "started" || l.action === "started_late");
      const completeLog = sorted.find((l) => l.action === "completed");

      if (startLog && completeLog) {
        const duration = differenceInMilliseconds(new Date(completeLog.created_at), new Date(startLog.created_at));
        if (duration > 0) {
          results.push({
            taskId,
            deptId: taskDeptMap.get(taskId) ?? null,
            duration,
            startedLate: startLog.action === "started_late",
          });
        }
      } else if (startLog) {
        results.push({
          taskId,
          deptId: taskDeptMap.get(taskId) ?? null,
          duration: 0,
          startedLate: startLog.action === "started_late",
        });
      }
    });

    return results;
  }, [filteredLogs, taskDeptMap]);

  // 1. Avg execution time by department
  const avgTimeByDept = useMemo(() => {
    const deptTotals = new Map<string, { total: number; count: number }>();
    executionData
      .filter((e) => e.duration > 0)
      .forEach((e) => {
        const key = e.deptId || "sem_setor";
        if (!deptTotals.has(key)) deptTotals.set(key, { total: 0, count: 0 });
        const d = deptTotals.get(key)!;
        d.total += e.duration;
        d.count += 1;
      });

    return Array.from(deptTotals.entries()).map(([deptId, { total, count }]) => ({
      department: deptId === "sem_setor" ? "Sem setor" : (deptNameMap.get(deptId) || "—"),
      avgMinutes: Math.round(total / count / 60000),
      avgMs: total / count,
    })).sort((a, b) => b.avgMinutes - a.avgMinutes);
  }, [executionData, deptNameMap]);

  // 2. Delay rate by department
  const delayRateByDept = useMemo(() => {
    const deptCounts = new Map<string, { total: number; late: number }>();
    executionData.forEach((e) => {
      const key = e.deptId || "sem_setor";
      if (!deptCounts.has(key)) deptCounts.set(key, { total: 0, late: 0 });
      const d = deptCounts.get(key)!;
      d.total += 1;
      if (e.startedLate) d.late += 1;
    });

    return Array.from(deptCounts.entries()).map(([deptId, { total, late }]) => ({
      department: deptId === "sem_setor" ? "Sem setor" : (deptNameMap.get(deptId) || "—"),
      rate: Math.round((late / total) * 100),
      late,
      total,
    })).sort((a, b) => b.rate - a.rate);
  }, [executionData, deptNameMap]);

  // 3. Completed tasks per day (last 7 days)
  const completedPerDay = useMemo(() => {
    const today = startOfDay(new Date());
    const days: { date: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      days.push({
        date: format(d, "yyyy-MM-dd"),
        label: format(d, "dd/MM", { locale: ptBR }),
        count: 0,
      });
    }

    filteredLogs
      .filter((l) => l.action === "completed")
      .forEach((l) => {
        const logDate = format(new Date(l.created_at), "yyyy-MM-dd");
        const day = days.find((d) => d.date === logDate);
        if (day) day.count += 1;
      });

    return days;
  }, [filteredLogs]);

  // 4. Summary indices
  const summary = useMemo(() => {
    const completed = executionData.filter((e) => e.duration > 0);
    const avgExecution = completed.length > 0
      ? completed.reduce((sum, e) => sum + e.duration, 0) / completed.length
      : 0;

    const totalStarted = executionData.length;
    const totalLate = executionData.filter((e) => e.startedLate).length;
    const delayRate = totalStarted > 0 ? Math.round((totalLate / totalStarted) * 100) : 0;

    const completedLast7 = completedPerDay.reduce((sum, d) => sum + d.count, 0);

    const worstDept = avgTimeByDept.length > 0 ? avgTimeByDept[0] : null;

    return { avgExecution, delayRate, completedLast7, worstDept };
  }, [executionData, completedPerDay, avgTimeByDept]);

  const chartConfigTime = {
    avgMinutes: { label: "Tempo médio (min)", color: "hsl(var(--primary))" },
  };
  const chartConfigDelay = {
    rate: { label: "Taxa de atraso (%)", color: "hsl(var(--destructive))" },
  };
  const chartConfigCompleted = {
    count: { label: "Concluídas", color: "hsl(var(--success))" },
  };

  const hasData = filteredLogs.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análise de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Sem dados de execução disponíveis para gerar análises. Os gráficos aparecerão quando tarefas forem iniciadas e concluídas.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">Análise de Performance</h2>

      {/* Index cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(summary.avgExecution)}</div>
            <p className="text-xs text-muted-foreground">por tarefa concluída</p>
          </CardContent>
        </Card>
        <Card className={summary.delayRate > 30 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Atraso</CardTitle>
            <TrendingDown className={`h-4 w-4 ${summary.delayRate > 30 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.delayRate > 30 ? "text-destructive" : ""}`}>{summary.delayRate}%</div>
            <p className="text-xs text-muted-foreground">tarefas iniciadas com atraso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas (7d)</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.completedLast7}</div>
            <p className="text-xs text-muted-foreground">últimos 7 dias</p>
          </CardContent>
        </Card>
        <Card className={summary.worstDept ? "border-warning/50 bg-warning/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maior Gargalo</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${summary.worstDept ? "text-warning" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{summary.worstDept?.department || "—"}</div>
            <p className="text-xs text-muted-foreground">
              {summary.worstDept ? formatDuration(summary.worstDept.avgMs) + " por tarefa" : "sem dados"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Avg execution time by department */}
        {avgTimeByDept.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio por Setor</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigTime} className="h-[250px] w-full">
                <BarChart data={avgTimeByDept} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v}min`} />
                  <YAxis type="category" dataKey="department" width={100} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgMinutes" fill="var(--color-avgMinutes)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Delay rate by department */}
        {delayRateByDept.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Atraso por Setor</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigDelay} className="h-[250px] w-full">
                <BarChart data={delayRateByDept} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <YAxis type="category" dataKey="department" width={100} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="rate" fill="var(--color-rate)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Completed per day */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas — Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigCompleted} className="h-[250px] w-full">
              <LineChart data={completedPerDay} margin={{ left: 10, right: 20, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-count)", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
