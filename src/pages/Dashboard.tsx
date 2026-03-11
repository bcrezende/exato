import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, Clock, CheckCircle, AlertTriangle, Calendar as CalendarIcon, LayoutGrid } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks"> & { assigned_profile?: { full_name: string | null } | null };

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  completed: "Concluída",
  overdue: "Atrasada",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
};

export default function Dashboard() {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "today" | "week" | "overdue">("all");
  const [view, setView] = useState<"kanban" | "calendar">("kanban");

  useEffect(() => {
    if (!user) return;
    const fetchTasks = async () => {
      let query = supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true });
      if (role === "employee") query = query.eq("assigned_to", user.id);
      const { data } = await query;
      if (data) setTasks(data as Task[]);
    };
    fetchTasks();
  }, [user]);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];

  const filteredTasks = tasks.filter((t) => {
    if (filter === "today") return t.due_date && t.due_date.startsWith(todayStr);
    if (filter === "week") return t.due_date && t.due_date >= todayStr && t.due_date <= weekEnd;
    if (filter === "overdue") return t.status === "overdue" || (t.due_date && t.due_date < now.toISOString() && t.status !== "completed");
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => t.status === "overdue" || (t.due_date && t.due_date < now.toISOString() && t.status !== "completed")).length,
  };

  const kanbanColumns = ["pending", "in_progress", "completed", "overdue"] as const;

  // Calendar logic
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const getTasksForDay = (day: number) => {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredTasks.filter((t) => t.due_date?.startsWith(dateStr));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral {role === "employee" ? "das suas tarefas" : role === "admin" ? "das tarefas da empresa" : role === "manager" ? "das tarefas do setor" : ""}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.inProgress}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.completed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.overdue}</div></CardContent>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          {([["all", "Todas"], ["today", "Hoje"], ["week", "Esta Semana"], ["overdue", "Atrasadas"]] as const).map(([key, label]) => (
            <Button key={key} variant={filter === key ? "default" : "outline"} size="sm" onClick={() => setFilter(key)}>
              {label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <Button variant={view === "kanban" ? "default" : "ghost"} size="icon" onClick={() => setView("kanban")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === "calendar" ? "default" : "ghost"} size="icon" onClick={() => setView("calendar")}>
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kanbanColumns.map((status) => {
            const columnTasks = filteredTasks.filter((t) => {
              if (status === "overdue") return t.due_date && t.due_date < now.toISOString() && t.status !== "completed";
              return t.status === status;
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
                        {task.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>}
                        <div className="mt-3 flex items-center gap-2">
                          <Badge className={priorityColors[task.priority]} variant="secondary">
                            {task.priority === "low" ? "Baixa" : task.priority === "medium" ? "Média" : "Alta"}
                          </Badge>
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.due_date).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                        {task.assigned_to && (
                          <p className="mt-2 text-xs text-muted-foreground">Atribuída</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Nenhuma tarefa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar View */}
      {view === "calendar" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => {
                if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); }
                else setCalendarMonth(calendarMonth - 1);
              }}>←</Button>
              <CardTitle>{monthNames[calendarMonth]} {calendarYear}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => {
                if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); }
                else setCalendarMonth(calendarMonth + 1);
              }}>→</Button>
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
                        <div key={t.id} className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${statusColors[t.status]}`}>
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} mais</span>
                      )}
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
