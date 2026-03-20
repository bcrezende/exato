import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfWeek, startOfMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { updateTaskStatus, generateNextRecurrence } from "@/lib/task-utils";
import { usePendingTasksCheck } from "@/hooks/usePendingTasksCheck";
import PendingTasksAlert from "@/components/tasks/PendingTasksAlert";
import RecurrenceConfirmDialog from "@/components/tasks/RecurrenceConfirmDialog";
import { useRecurrenceDefinitions } from "@/hooks/useRecurrenceDefinitions";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import AdminPeriodToggle, { type AdminPeriod } from "@/components/dashboard/admin/AdminPeriodToggle";
import { MyDaySkeleton } from "@/components/skeletons/MyDaySkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play, CheckCircle, Clock, AlertTriangle, PartyPopper,
  ListTodo, CalendarDays, CheckCheck, AlertCircle, ArrowRight
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

/* ── helpers ── */
function formatTime(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(progress * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{display}</span>;
}

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const colors = [
      "hsl(142, 71%, 45%)", "hsl(221, 83%, 53%)",
      "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)", "hsl(350, 80%, 55%)",
    ];
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * canvas.height * 0.5,
      w: 4 + Math.random() * 6, h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
      rotation: Math.random() * 360, rotationSpeed: (Math.random() - 0.5) * 10,
    }));
    let animationId: number;
    const startTime = performance.now();
    const duration = 3000;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed > duration) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fade = elapsed > duration * 0.7 ? 1 - (elapsed - duration * 0.7) / (duration * 0.3) : 1;
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.rotation += p.rotationSpeed;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = fade; ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ── date range ── */
function getDateRange(period: AdminPeriod) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const todayStart = new Date(Date.UTC(y, m, d, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

  switch (period) {
    case "yesterday": {
      const yd = subDays(todayStart, 1);
      return { start: yd.toISOString(), end: new Date(Date.UTC(yd.getFullYear(), yd.getMonth(), yd.getDate(), 23, 59, 59, 999)).toISOString() };
    }
    case "week": {
      const ws = startOfWeek(todayStart, { weekStartsOn: 1 });
      return { start: ws.toISOString(), end: todayEnd.toISOString() };
    }
    case "month": {
      const ms = startOfMonth(todayStart);
      return { start: ms.toISOString(), end: todayEnd.toISOString() };
    }
    default:
      return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
  }
}

/* ── DONUT CHART COLORS ── */
const STATUS_COLORS = {
  completed: "hsl(var(--success))",
  in_progress: "hsl(var(--primary))",
  pending: "hsl(var(--warning))",
  overdue: "hsl(var(--destructive))",
};

/* ── main component ── */
export default function AnalystDashboard() {
  const { user, profile } = useAuth();
  const [period, setPeriod] = useState<AdminPeriod>("today");
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const { checkBeforeStart, pendingTasks, isAlertOpen, closeAlert, proceedAction } = usePendingTasksCheck();

  const dateRange = useMemo(() => getDateRange(period), [period]);

  /* fetch tasks for period */
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", user.id)
      .or(`status.eq.overdue,and(start_date.gte.${dateRange.start},start_date.lte.${dateRange.end}),and(due_date.gte.${dateRange.start},due_date.lte.${dateRange.end})`)
      .order("start_date", { ascending: true, nullsFirst: false });
    if (data) {
      data.sort((a, b) => {
        if (a.status === "overdue" && b.status !== "overdue") return -1;
        if (a.status !== "overdue" && b.status === "overdue") return 1;
        return 0;
      });
      setAllTasks(data);
    }
    setLoading(false);
  }, [user, dateRange]);

  /* fetch upcoming (tomorrow+) */
  const fetchUpcoming = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0));
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", user.id)
      .in("status", ["pending", "in_progress"])
      .gte("start_date", tomorrow.toISOString())
      .order("start_date", { ascending: true })
      .limit(3);
    if (data) setUpcomingTasks(data);
  }, [user]);

  useEffect(() => { fetchTasks(); fetchUpcoming(); }, [fetchTasks, fetchUpcoming]);

  /* today tasks (always current day for checklist) */
  const todayTasks = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, "0"), d = String(now.getDate()).padStart(2, "0");
    const dayStart = `${y}-${m}-${d}T00:00:00+00:00`;
    const dayEnd = `${y}-${m}-${d}T23:59:59.999+00:00`;
    return allTasks.filter(t =>
      t.status === "overdue" ||
      (t.start_date && t.start_date >= dayStart && t.start_date <= dayEnd) ||
      (t.due_date && t.due_date >= dayStart && t.due_date <= dayEnd)
    );
  }, [allTasks]);

  /* stats */
  const stats = useMemo(() => ({
    total: allTasks.length,
    overdue: allTasks.filter(t => t.status === "overdue").length,
    pending: allTasks.filter(t => t.status === "pending").length,
    inProgress: allTasks.filter(t => t.status === "in_progress").length,
    completed: allTasks.filter(t => t.status === "completed").length,
  }), [allTasks]);

  /* status change */
  const executeStatusChange = async (taskId: string, newStatus: "in_progress" | "completed") => {
    const task = allTasks.find(t => t.id === taskId);
    const prev = allTasks;
    setAllTasks(p => p.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (newStatus === "in_progress") {
      setHighlightedId(taskId); setTimeout(() => setHighlightedId(null), 800);
    } else {
      setSuccessId(taskId); setTimeout(() => setSuccessId(null), 1500);
    }
    toast.success(newStatus === "in_progress" ? "Tarefa iniciada!" : "Tarefa concluída!");
    try {
      const { generatedRecurring } = await updateTaskStatus(taskId, newStatus, task);
      if (generatedRecurring) { fetchTasks(); fetchUpcoming(); }
    } catch {
      setAllTasks(prev);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleStatusChange = (taskId: string, newStatus: "in_progress" | "completed") => {
    if (newStatus === "in_progress") {
      checkBeforeStart(taskId, () => executeStatusChange(taskId, newStatus));
    } else {
      executeStatusChange(taskId, newStatus);
    }
  };

  /* donut data */
  const donutData = useMemo(() => [
    { name: "Concluídas", value: stats.completed, color: STATUS_COLORS.completed },
    { name: "Em andamento", value: stats.inProgress, color: STATUS_COLORS.in_progress },
    { name: "Pendentes", value: stats.pending, color: STATUS_COLORS.pending },
    { name: "Atrasadas", value: stats.overdue, color: STATUS_COLORS.overdue },
  ].filter(d => d.value > 0), [stats]);

  /* upcoming days grouped */
  const upcomingByDay = useMemo(() => {
    if (!user) return [];
    const now = new Date();
    const days: { label: string; date: string; tasks: Task[] }[] = [];
    for (let i = 1; i <= 7; i++) {
      const day = addDays(now, i);
      const y = day.getFullYear(), m = String(day.getMonth() + 1).padStart(2, "0"), d = String(day.getDate()).padStart(2, "0");
      const dayStart = `${y}-${m}-${d}T00:00:00+00:00`;
      const dayEnd = `${y}-${m}-${d}T23:59:59.999+00:00`;
      const dayTasks = allTasks.filter(t =>
        t.status !== "completed" && (
          (t.start_date && t.start_date >= dayStart && t.start_date <= dayEnd) ||
          (t.due_date && t.due_date >= dayStart && t.due_date <= dayEnd)
        )
      );
      if (dayTasks.length > 0) {
        days.push({
          label: format(day, "EEEE, dd/MM", { locale: ptBR }),
          date: dayStart,
          tasks: dayTasks,
        });
      }
    }
    return days;
  }, [allTasks, user]);

  const allTodayCompleted = todayTasks.length > 0 && todayTasks.every(t => t.status === "completed");
  const formattedDate = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  if (loading) return <MyDaySkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Dashboard</h1>
          <p className="text-muted-foreground capitalize">{formattedDate}</p>
          {profile?.full_name && (
            <p className="text-sm text-muted-foreground mt-1">{profile.full_name}</p>
          )}
        </div>
        <AdminPeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <KpiCard icon={<ListTodo className="h-4 w-4 text-primary" />} label="Tarefas" value={stats.total} bg="bg-primary/10" />
        <KpiCard icon={<Play className="h-4 w-4 text-primary" />} label="Em Andamento" value={stats.inProgress} bg="bg-primary/10" />
        <KpiCard icon={<CheckCircle className="h-4 w-4 text-success" />} label="Concluídas" value={stats.completed} bg="bg-success/10" />
        <KpiCard icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Atrasadas" value={stats.overdue} bg="bg-destructive/10" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today" className="gap-1.5 text-xs"><ListTodo className="h-3.5 w-3.5" />Hoje</TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" />Próximos</TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5 text-xs"><CheckCheck className="h-3.5 w-3.5" />Concluídas</TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1.5 text-xs"><AlertCircle className="h-3.5 w-3.5" />Atrasadas</TabsTrigger>
        </TabsList>

        {/* TAB: Hoje */}
        <TabsContent value="today" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Donut */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Produtividade</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.total === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa no período</p>
                ) : (
                  <div className="relative h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                          {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold">{Math.round((stats.completed / stats.total) * 100)}%</span>
                      <span className="text-xs text-muted-foreground">{stats.completed} de {stats.total}</span>
                    </div>
                  </div>
                )}
                {/* legend */}
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Checklist + Upcoming */}
            <div className="lg:col-span-2 space-y-6">
              {/* Checklist */}
              {allTodayCompleted ? (
                <Card className="border-success/30 bg-success/5">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center relative overflow-hidden">
                    <ConfettiCanvas />
                    <PartyPopper className="h-12 w-12 text-success mb-3 animate-scale-in" />
                    <h3 className="font-semibold text-lg">Parabéns! Todas as tarefas de hoje concluídas! 🎉</h3>
                    <p className="text-sm text-muted-foreground">Excelente trabalho!</p>
                  </CardContent>
                </Card>
              ) : todayTasks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <ListTodo className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <h3 className="font-semibold text-lg">Nenhuma tarefa para hoje</h3>
                    <p className="text-sm text-muted-foreground">Aproveite o dia! 🎉</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Tarefas de Hoje</h3>
                  {todayTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      highlightedId={highlightedId}
                      successId={successId}
                      onStatusChange={handleStatusChange}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))}
                </div>
              )}

              {/* Upcoming preview */}
              {upcomingTasks.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />Próximas Tarefas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {upcomingTasks.map(t => (
                      <div key={t.id} className="flex items-center justify-between py-1.5 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2" onClick={() => setSelectedTask(t)}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.start_date ? format(new Date(t.start_date), "EEE, dd/MM", { locale: ptBR }) : "Sem data"}
                          </p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB: Próximos Dias */}
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingByDay.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <h3 className="font-semibold">Nenhuma tarefa nos próximos dias</h3>
              </CardContent>
            </Card>
          ) : (
            upcomingByDay.map(day => (
              <div key={day.date}>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 capitalize">{day.label}</h3>
                <div className="space-y-2">
                  {day.tasks.map(task => (
                    <TaskRow key={task.id} task={task} highlightedId={null} successId={null} onStatusChange={handleStatusChange} onClick={() => setSelectedTask(task)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* TAB: Concluídas */}
        <TabsContent value="completed" className="space-y-2">
          {(() => {
            const completed = allTasks.filter(t => t.status === "completed");
            if (completed.length === 0) return (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCheck className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="font-semibold">Nenhuma tarefa concluída no período</h3>
                </CardContent>
              </Card>
            );
            return completed.map(task => (
              <TaskRow key={task.id} task={task} highlightedId={null} successId={null} onStatusChange={handleStatusChange} onClick={() => setSelectedTask(task)} />
            ));
          })()}
        </TabsContent>

        {/* TAB: Atrasadas */}
        <TabsContent value="overdue" className="space-y-2">
          {(() => {
            const overdue = allTasks.filter(t => t.status === "overdue");
            if (overdue.length === 0) return (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-success/40 mb-3" />
                  <h3 className="font-semibold">Nenhuma tarefa atrasada! 🎉</h3>
                </CardContent>
              </Card>
            );
            return overdue.map(task => (
              <TaskRow key={task.id} task={task} highlightedId={null} successId={null} onStatusChange={handleStatusChange} onClick={() => setSelectedTask(task)} />
            ));
          })()}
        </TabsContent>
      </Tabs>

      {/* Task detail modal */}
      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
        members={[]}
        departments={[]}
        onEdit={() => {}}
        onRefresh={() => { fetchTasks(); fetchUpcoming(); }}
      />

      <PendingTasksAlert
        open={isAlertOpen}
        tasks={pendingTasks}
        onClose={closeAlert}
        onProceed={() => proceedAction?.()}
      />
    </div>
  );
}

/* ── sub-components ── */

function KpiCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <Card className="hover-lift">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-full p-2 ${bg}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold"><AnimatedCounter value={value} /></p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  in_progress: { label: "Em andamento", variant: "default" },
  completed: { label: "Concluída", variant: "secondary" },
  overdue: { label: "Atrasada", variant: "destructive" },
};

function TaskRow({
  task, highlightedId, successId, onStatusChange, onClick,
}: {
  task: Task;
  highlightedId: string | null;
  successId: string | null;
  onStatusChange: (id: string, status: "in_progress" | "completed") => void;
  onClick: () => void;
}) {
  const sb = statusBadge[task.status] || statusBadge.pending;
  return (
    <Card
      className={`transition-all hover-lift cursor-pointer ${task.status === "completed" ? "opacity-60" : ""} ${
        highlightedId === task.id ? "animate-highlight-flash" : ""
      } ${successId === task.id ? "animate-highlight-success animate-pulse-success border-2 border-success/50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="hidden sm:flex flex-col items-center text-xs text-muted-foreground min-w-[80px]">
          {formatTime(task.start_date) && <span className="font-medium">{formatTime(task.start_date)}</span>}
          {formatTime(task.start_date) && formatTime(task.due_date) && <span>→</span>}
          {formatTime(task.due_date) && <span className="font-medium">{formatTime(task.due_date)}</span>}
          {!formatTime(task.start_date) && !formatTime(task.due_date) && <span className="italic">Sem horário</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium leading-tight ${task.status === "completed" ? "line-through" : ""}`}>{task.title}</h4>
          {task.description && <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{task.description}</p>}
          <span className="sm:hidden text-xs text-muted-foreground mt-1 block">{formatTime(task.start_date) || "Sem horário"}</span>
        </div>
        <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
          {(task.status === "pending" || task.status === "overdue") && (
            <Button size="sm" variant={task.status === "overdue" ? "destructive" : "outline"} className="gap-1.5" onClick={() => onStatusChange(task.id, "in_progress")}>
              <Play className="h-3.5 w-3.5" /><span className="hidden sm:inline">Iniciar</span>
            </Button>
          )}
          {task.status === "in_progress" && (
            <Button size="sm" className="gap-1.5" onClick={() => onStatusChange(task.id, "completed")}>
              <CheckCircle className="h-3.5 w-3.5" /><span className="hidden sm:inline">Concluir</span>
            </Button>
          )}
          {task.status === "completed" && (
            <Badge variant="secondary" className="bg-success/10 text-success">
              <CheckCircle className="h-3 w-3 mr-1" />Concluída
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
