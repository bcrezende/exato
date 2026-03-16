import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ListTodo, Clock, CheckCircle, AlertTriangle,
  Calendar as CalendarIcon, ChevronRight, Building2, User
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import { format, differenceInDays, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import MyDayView from "@/components/dashboard/MyDayView";
import PerformanceAnalytics from "@/components/dashboard/PerformanceAnalytics";

type Task = Tables<"tasks">;
type Profile = { id: string; full_name: string | null; department_id: string | null };

const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada" };

function AdminManagerDashboard() {
  const { user, role, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [timeLogs, setTimeLogs] = useState<{ id: string; task_id: string; user_id: string; action: string; created_at: string }[]>([]);


  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [tasksRes, profilesRes, depsRes, logsRes] = await Promise.all([
        supabase.from("tasks").select("*").order("due_date", { ascending: true }),
        supabase.from("profiles").select("id, full_name, department_id"),
        supabase.from("departments").select("id, name").order("name"),
        supabase.from("task_time_logs").select("*").order("created_at", { ascending: true }),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (depsRes.data) {
        if (role === "manager" && profile?.department_id) {
          setDepartments(depsRes.data.filter(d => d.id === profile.department_id));
          setSelectedDepartment(profile.department_id);
        } else {
          setDepartments(depsRes.data);
        }
      }
      if (logsRes.data) setTimeLogs(logsRes.data);
      if (profilesRes.data) {
        const map = new Map<string, string>();
        profilesRes.data.forEach((p: Profile) => map.set(p.id, p.full_name || "Sem nome"));
        setProfiles(map);
        setProfilesList(profilesRes.data as Profile[]);
      }
    };
    fetchData();
  }, [user, role, profile]);

  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");

  const filteredTasks = useMemo(() => {
    if (!selectedDepartment) return tasks;
    return tasks.filter((t) => t.department_id === selectedDepartment);
  }, [tasks, selectedDepartment]);

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

    filteredTasks.forEach((t) => {
      const isCompleted = t.status === "completed";
      const isInProgress = t.status === "in_progress";
      const isOverdue = !isInProgress && (t.status === "overdue" || (!isCompleted && t.due_date && t.due_date < new Date().toISOString()));

      if (isOverdue && !isCompleted) {
        overdue.push(t);
        return;
      }

      if (isInProgress) {
        todayList.push(t);
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

    // Sort overdue: most days delayed first
    overdue.sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date).getTime() : 0;
      const db = b.due_date ? new Date(b.due_date).getTime() : 0;
      return da - db;
    });

    return { overdueTasks: overdue, todayTasks: todayList, upcomingDays: upcoming };
  }, [filteredTasks, todayStr]);

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
        <div className="flex items-center gap-3">
          <Select value={selectedDepartment ?? "all"} onValueChange={(v) => setSelectedDepartment(v === "all" ? null : v)}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Monitoring sections */}
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
                        : `${day.tasks.length} tarefas`}
                    </p>
                    {day.tasks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {day.tasks.slice(0, 3).map((t) => (
                          <div key={t.id} className="flex items-center gap-2 text-xs">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
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

      {/* Performance Analytics */}
      <PerformanceAnalytics
        tasks={tasks}
        timeLogs={timeLogs}
        departments={departments}
        selectedDepartment={selectedDepartment}
      />
    </div>
  );
}

function TaskMiniCard({ task, getName }: { task: Task; getName: (id: string | null) => string }) {
  return (
    <div className="rounded-lg border p-3">
      <h5 className="text-sm font-medium truncate">{task.title}</h5>
      <span className="text-xs text-muted-foreground">{getName(task.assigned_to)}</span>
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
