import { useState, useEffect, useMemo, useCallback } from "react";
import { devError } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrainCircuit, Loader2, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { subWeeks, subMonths, startOfDay } from "date-fns";
import { AnalysisHistoryTable } from "@/components/analysis/AnalysisHistoryTable";

type Period = "today" | "week" | "month";
type Profile = { id: string; full_name: string | null; department_id: string | null };
type Department = { id: string; name: string };

const periodLabels: Record<Period, string> = {
  today: "Hoje",
  week: "Última semana",
  month: "Último mês",
};

export default function Analysis() {
  const { user, role, profile: authProfile } = useAuth();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [period, setPeriod] = useState<Period>("today");
  const [sectorId, setSectorId] = useState<string>("all");
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("analysis_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory(data || []);
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [depsRes, profilesRes] = await Promise.all([
        supabase.from("departments").select("id, name").order("name"),
        supabase.from("profiles").select("id, full_name, department_id"),
      ]);
      if (depsRes.data) {
        if (role === "manager" && authProfile?.department_id) {
          setDepartments(depsRes.data.filter(d => d.id === authProfile.department_id));
          setSectorId(authProfile.department_id);
        } else {
          setDepartments(depsRes.data);
        }
      }
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
      setLoadingData(false);
    };
    fetch();
    fetchHistory();
  }, [user, role, authProfile, fetchHistory]);

  const employeeOptions = useMemo(() => {
    let list = profiles;
    if (sectorId !== "all") list = list.filter((p) => p.department_id === sectorId);
    return list.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [profiles, sectorId]);

  const resetFilters = () => {
    setResult(null);
    setPeriod("today");
    setSectorId(role === "manager" && authProfile?.department_id ? authProfile.department_id : "all");
    setEmployeeId("all");
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    try {
      const now = new Date();
      const startMap: Record<Period, Date> = {
        today: startOfDay(now),
        week: subWeeks(now, 1),
        month: subMonths(now, 1),
      };
      const startDate = startMap[period].toISOString();

      let tasksQuery = supabase.from("tasks").select("*").gte("created_at", startDate);
      if (sectorId !== "all") tasksQuery = tasksQuery.eq("department_id", sectorId);
      if (employeeId !== "all") tasksQuery = tasksQuery.eq("assigned_to", employeeId);
      const { data: tasks } = await tasksQuery;

      const { data: timeLogs } = await supabase.from("task_time_logs").select("*").gte("created_at", startDate);

      const taskList = tasks || [];
      const logList = timeLogs || [];

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
      const topSlowTasks = [...durations].sort((a, b) => b.minutes - a.minutes).slice(0, 3);

      const sectorName = sectorId === "all" ? "Todos os setores" : departments.find((d) => d.id === sectorId)?.name || sectorId;
      const employeeName = employeeId === "all" ? "Todos os analistas" : profiles.find((p) => p.id === employeeId)?.full_name || employeeId;

      // Estimated vs actual metrics
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

      // Difficulty metrics
      const tasksWithDifficulty = taskList.filter((t: any) => t.difficulty_rating && t.difficulty_rating > 0);
      const avgDifficulty = tasksWithDifficulty.length > 0
        ? (tasksWithDifficulty.reduce((s: number, t: any) => s + t.difficulty_rating, 0) / tasksWithDifficulty.length).toFixed(1)
        : null;
      const difficultyDistribution = [1, 2, 3, 4, 5].map(r => ({
        rating: r,
        count: tasksWithDifficulty.filter((t: any) => t.difficulty_rating === r).length,
      }));
      const hardestTasks = [...tasksWithDifficulty].sort((a: any, b: any) => b.difficulty_rating - a.difficulty_rating).slice(0, 3);

      const { data, error } = await supabase.functions.invoke("generate-analysis", {
        body: {
          metrics: {
            totalTasks, completed, pending, inProgress, overdue,
            completionRate, delayRate, avgExecutionMinutes,
            highPriority, mediumPriority, lowPriority,
            topSlowTasks: topSlowTasks.map((t) => ({ title: t.title, minutes: t.minutes })),
            avgEstimateDeviation,
            topDeviations: topDeviations.map(d => ({ title: d.title, estimated: d.estimated, actual: d.actual, deviation: d.deviation })),
            avgDifficulty,
            difficultyDistribution,
            hardestTasks: hardestTasks.map((t: any) => ({ title: t.title, difficulty: t.difficulty_rating })),
          },
          filters: { periodLabel: periodLabels[period], sectorName, employeeName },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.analysis);

      // Save to history
      if (data.analysis && authProfile?.company_id) {
        await supabase.from("analysis_history").insert({
          user_id: user!.id,
          company_id: authProfile.company_id,
          period_label: periodLabels[period],
          sector_name: sectorName,
          employee_name: employeeName,
          content: data.analysis,
        });
        fetchHistory();
      }
    } catch (e: any) {
      devError(e);
      toast({ title: "Erro", description: e.message || "Falha ao gerar análise.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-primary" />
          Análise IA
        </h1>
        <p className="text-muted-foreground">Configure os filtros e gere uma análise de produtividade com inteligência artificial.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros da Análise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Período</label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Setor</label>
              <Select value={sectorId} onValueChange={(v) => { setSectorId(v); setEmployeeId("all"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Analista</label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employeeOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAnalyze} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
            {loading ? "Analisando..." : "Gerar Análise"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                Resultado da Análise
              </CardTitle>
              <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Nova Análise
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[60vh]">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <AnalysisHistoryTable history={history} onDeleted={fetchHistory} />
    </div>
  );
}
