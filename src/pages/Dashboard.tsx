import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ListTodo, Clock, CheckCircle, AlertTriangle,
  Calendar as CalendarIcon, LayoutGrid, ChevronRight
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { format, differenceInDays, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import MyDayView from "@/components/dashboard/MyDayView";

type Task = Tables<"tasks">;
type Profile = { id: string; full_name: string | null };

const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };
const priorityColors: Record<string, string> = { low: "bg-muted text-muted-foreground", medium: "bg-warning/10 text-warning", high: "bg-destructive/10 text-destructive" };
const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada" };
const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

function AdminManagerDashboard() {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [showFullView, setShowFullView] = useState<"kanban" | "calendar" | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [tasksRes, profilesRes] = await Promise.all([
        supabase.from("tasks").select("*").order("due_date", { ascending: true }),
        supabase.from("profiles").select("id, full_name"),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (profilesRes.data) {
        const map = new Map<string, string>();
        profilesRes.data.forEach((p: Profile) => map.set(p.id, p.full_name || "Sem nome"));
        setProfiles(map);
      }
    };
    fetchData();
  }, [user]);

  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");

  const { overdueTasks, todayTasks, upcomingDays } = useMemo(() => {
    const overdue: Task[] = [];
    const todayList: Task[] = [];
    const upcoming: { date: Date; label: string; tasks: Task[] }[] = [];

    for (let i = 1; i <= 3; i++) {
      const d = addDays(today, i);
      upcoming.push({
        date: d,
        label: format(d, "EEEE, dd/MM", { locale: ptBR }),
        tasks: [],
      });
    }

    tasks.forEach((t) => {
      const isCompleted = t.status === "completed";
      const isOverdue = t.status === "overdue" || (!isCompleted && t.due_date && t.due_date < new Date().toISOString());

      if (isOverdue && !isCompleted) {
        overdue.push(t);
        return;
      }

      const dueDay = t.due_date?.split("T")[0];
      const startDay = t.start_date?.split("T")[0];

      if (dueDay === todayStr || startDay === todayStr) {
        todayList.push(t);
        return;
      }

      upcoming.forEach((u) => {
        const uStr = format(u.date, "yyyy-MM-dd");
        if (dueDay === uStr || startDay === uStr) {
          u.tasks.push(t);
        }
      });
    });

    // Sort overdue: high priority first, then most days delayed
    overdue.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 1;
      const pb = priorityOrder[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      const da = a.due_date ? new Date(a.due_date).getTime() : 0;
      const db = b.due_date ? new Date(b.due_date).getTime() : 0;
      return da - db;
    });

    return { overdueTasks: overdue, todayTasks: todayList, upcomingDays: upcoming };
  }, [tasks, todayStr]);

  const todayCompleted = todayTasks.filter((t) => t.status === "completed").length;
  const todayTotal = todayTasks.length;
  const todayProgress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const todayPending = todayTasks.filter((t) => t.status === "pending");
  const todayInProgress = todayTasks.filter((t) => t.status === "in_progress");
  const todayDone = todayTasks.filter((t) => t.status === "completed");

  const getName = (id: string | null) => (id ? profiles.get(id) || "—" : "Não atribuída");

  const getDaysLate = (dueDate: string | null) => {
    if (!dueDate) return 0;
    return Math.max(0, differenceInDays(today, new Date(dueDate)));
  };

  // Calendar state for full view
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const statusColors: Record<string, string> = { pending: "bg-muted text-muted-foreground", in_progress: "bg-primary/10 text-primary", completed: "bg-success/10 text-success", overdue: "bg-destructive/10 text-destructive" };

  const getTasksForDay = (day: number) => {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => t.due_date?.startsWith(dateStr) || t.start_date?.startsWith(dateStr));
  };

  const kanbanColumns = ["pending", "in_progress", "completed", "overdue"] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })} — {role === "admin" ? "Visão geral da empresa" : "Visão do setor"}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant={showFullView === "kanban" ? "default" : "outline"} size="sm" onClick={() => setShowFullView(showFullView === "kanban" ? null : "kanban")}>
            <LayoutGrid className="mr-1 h-4 w-4" /> Kanban
          </Button>
          <Button variant={showFullView === "calendar" ? "default" : "outline"} size="sm" onClick={() => setShowFullView(showFullView === "calendar" ? null : "calendar")}>
            <CalendarIcon className="mr-1 h-4 w-4" /> Calendário
          </Button>
        </div>
      </div>

      {/* Stats Cards - Today focused */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Hoje</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayTotal}</div>
            <p className="text-xs text-muted-foreground">{todayProgress}% concluídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayInProgress.length}</div>
            <p className="text-xs text-muted-foreground">sendo executadas agora</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas Hoje</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCompleted}</div>
            <p className="text-xs text-muted-foreground">de {todayTotal} do dia</p>
          </CardContent>
        </Card>
        <Card className={overdueTasks.length > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdueTasks.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueTasks.length > 0 ? "text-destructive" : ""}`}>{overdueTasks.length}</div>
            <p className="text-xs text-muted-foreground">requerem atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Show monitoring view or full view */}
      {showFullView === null && (
        <>
          {/* 🔴 Overdue Section */}
          {overdueTasks.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-lg">Atenção Imediata</CardTitle>
                  <Badge variant="destructive" className="ml-auto">{overdueTasks.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueTasks.map((task) => {
                    const daysLate = getDaysLate(task.due_date);
                    return (
                      <div key={task.id} className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{task.title}</h4>
                          <p className="text-sm text-muted-foreground">{getName(task.assigned_to)}</p>
                        </div>
                        <Badge className={priorityColors[task.priority]} variant="secondary">
                          {priorityLabels[task.priority]}
                        </Badge>
                        <Badge variant="destructive">
                          {daysLate === 0 ? "Vence hoje" : `${daysLate}d atraso`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 📋 Today Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Tarefas de Hoje</CardTitle>
                </div>
                <span className="text-sm text-muted-foreground">{todayCompleted}/{todayTotal} concluídas</span>
              </div>
              {todayTotal > 0 && <Progress value={todayProgress} className="mt-2 h-2" />}
            </CardHeader>
            <CardContent>
              {todayTotal === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  Nenhuma tarefa agendada para hoje
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Pending */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                      Pendentes ({todayPending.length})
                    </div>
                    {todayPending.map((t) => (
                      <TaskMiniCard key={t.id} task={t} getName={getName} />
                    ))}
                  </div>
                  {/* In Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      Em Andamento ({todayInProgress.length})
                    </div>
                    {todayInProgress.map((t) => (
                      <TaskMiniCard key={t.id} task={t} getName={getName} />
                    ))}
                  </div>
                  {/* Completed */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-success">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      Concluídas ({todayDone.length})
                    </div>
                    {todayDone.map((t) => (
                      <TaskMiniCard key={t.id} task={t} getName={getName} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 📅 Upcoming Days */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Próximos Dias</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {upcomingDays.map((day) => (
                  <div key={day.label} className="rounded-lg border p-4">
                    <h4 className="text-sm font-semibold capitalize">{day.label}</h4>
                    <div className="mt-2 text-2xl font-bold">{day.tasks.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {day.tasks.length === 0
                        ? "Nenhuma tarefa"
                        : `${day.tasks.filter((t) => t.priority === "high").length} alta prioridade`}
                    </p>
                    {day.tasks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {day.tasks.slice(0, 3).map((t) => (
                          <div key={t.id} className="flex items-center gap-2 text-xs">
                            <div className={`h-1.5 w-1.5 rounded-full ${t.priority === "high" ? "bg-destructive" : t.priority === "medium" ? "bg-warning" : "bg-muted-foreground"}`} />
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}
                        {day.tasks.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{day.tasks.length - 3} mais</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Kanban Full View */}
      {showFullView === "kanban" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kanbanColumns.map((status) => {
            const columnTasks = tasks.filter((t) => {
              if (status === "overdue") return t.due_date && t.due_date < new Date().toISOString() && t.status !== "completed";
              return t.status === status;
            });
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${status === "pending" ? "bg-muted-foreground" : status === "in_progress" ? "bg-primary" : status === "completed" ? "bg-success" : "bg-destructive"}`} />
                  <h3 className="text-sm font-semibold">{statusLabels[status]}</h3>
                  <Badge variant="secondary" className="ml-auto">{columnTasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {columnTasks.map((task) => (
                    <Card key={task.id} className="cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <h4 className="font-medium leading-tight">{task.title}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{getName(task.assigned_to)}</p>
                        {task.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>}
                        <div className="mt-3 flex items-center gap-2">
                          <Badge className={priorityColors[task.priority]} variant="secondary">
                            {priorityLabels[task.priority]}
                          </Badge>
                          {task.due_date && <span className="text-xs text-muted-foreground">{format(new Date(task.due_date), "dd/MM")}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma tarefa</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar Full View */}
      {showFullView === "calendar" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else setCalendarMonth(calendarMonth - 1); }}>←</Button>
              <CardTitle>{monthNames[calendarMonth]} {calendarYear}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else setCalendarMonth(calendarMonth + 1); }}>→</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {calendarDays.map((day) => {
                const dayTasks = getTasksForDay(day);
                const isToday = day === now.getDate() && calendarMonth === now.getMonth() && calendarYear === now.getFullYear();
                return (
                  <div key={day} className={`min-h-[80px] rounded-lg border p-1 ${isToday ? "border-primary bg-primary/5" : ""}`}>
                    <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {dayTasks.slice(0, 3).map((t) => (
                        <div key={t.id} className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${statusColors[t.status]}`}>{t.title}</div>
                      ))}
                      {dayTasks.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} mais</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TaskMiniCard({ task, getName }: { task: Task; getName: (id: string | null) => string }) {
  return (
    <div className="rounded-lg border p-3">
      <h5 className="text-sm font-medium truncate">{task.title}</h5>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{getName(task.assigned_to)}</span>
        <Badge className={priorityColors[task.priority]} variant="secondary" className2-hack="">
          {priorityLabels[task.priority]}
        </Badge>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { role } = useAuth();

  if (role === "employee") {
    return <MyDayView />;
  }

  return <AdminManagerDashboard />;
}
