import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrainCircuit, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { subDays, subWeeks, subMonths, startOfDay, format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  departments: { id: string; name: string }[];
  profiles: { id: string; full_name: string | null; department_id: string | null }[];
}

type Period = "today" | "week" | "month";

const periodLabels: Record<Period, string> = {
  today: "Hoje",
  week: "Última semana",
  month: "Último mês",
};

export default function AIAnalysisDialog({ departments, profiles }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("today");
  const [sectorId, setSectorId] = useState<string>("all");
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const employeeOptions = useMemo(() => {
    let list = profiles;
    if (sectorId !== "all") list = list.filter((p) => p.department_id === sectorId);
    return list.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [profiles, sectorId]);

  const resetFilters = () => {
    setResult(null);
    setPeriod("today");
    setSectorId("all");
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

      // Fetch tasks
      let tasksQuery = supabase.from("tasks").select("*").gte("created_at", startDate);
      if (sectorId !== "all") tasksQuery = tasksQuery.eq("department_id", sectorId);
      if (employeeId !== "all") tasksQuery = tasksQuery.eq("assigned_to", employeeId);
      const { data: tasks } = await tasksQuery;

      // Fetch time logs
      let logsQuery = supabase.from("task_time_logs").select("*").gte("created_at", startDate);
      const { data: timeLogs } = await logsQuery;

      const taskList = tasks || [];
      const logList = timeLogs || [];

      // Calculate metrics
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

      // Avg execution time from logs
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
      const employeeName = employeeId === "all" ? "Todos os funcionários" : profiles.find((p) => p.id === employeeId)?.full_name || employeeId;

      const { data, error } = await supabase.functions.invoke("generate-analysis", {
        body: {
          metrics: {
            totalTasks, completed, pending, inProgress, overdue,
            completionRate, delayRate, avgExecutionMinutes,
            highPriority, mediumPriority, lowPriority,
            topSlowTasks: topSlowTasks.map((t) => ({ title: t.title, minutes: t.minutes })),
          },
          filters: {
            periodLabel: periodLabels[period],
            sectorName,
            employeeName,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.analysis);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: e.message || "Falha ao gerar análise.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetFilters(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BrainCircuit className="h-4 w-4" />
          Análise IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Assistente de Análise
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
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
                <label className="text-sm font-medium">Funcionário</label>
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
          </div>
        ) : (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <ScrollArea className="flex-1 rounded-lg border p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </ScrollArea>
            <Button variant="outline" onClick={resetFilters} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Nova Análise
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
