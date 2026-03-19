import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { devError } from "@/lib/logger";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Bell, Activity, AlertTriangle, CheckCircle2, BarChart3, ListTodo, Calendar as CalendarIcon, LayoutGrid } from "lucide-react";
import { format } from "date-fns";
import { formatStoredDate } from "@/lib/date-utils";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TaskForm from "@/components/tasks/TaskForm";
import TaskCalendar from "@/components/tasks/TaskCalendar";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type Profile = Tables<"profiles">;
type Department = Tables<"departments">;

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  completed: "Concluída",
  overdue: "Atrasada",
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
};

const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };

export default function AnalystDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, profile: myProfile, role } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [analyst, setAnalyst] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [sortField, setSortField] = useState<"priority" | "due_date" | "status">("due_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!userId || !myProfile?.company_id) return;
    fetchData();
  }, [userId, myProfile?.company_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const companyId = myProfile!.company_id!;
      const [analystRes, tasksRes, membersRes, deptsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).single(),
        supabase.from("tasks").select("*").eq("company_id", companyId).eq("assigned_to", userId!),
        supabase.from("profiles").select("*").eq("company_id", companyId),
        supabase.from("departments").select("*").eq("company_id", companyId),
      ]);
      setAnalyst(analystRes.data);
      setTasks(tasksRes.data || []);
      setMembers(membersRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const overdue = tasks.filter((t) => t.status === "overdue").length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;
  const productivity = total > 0 ? Math.round((completed / total) * 100) : 0;

  const activity = inProgress > 0 ? "active" : (tasks.some((t) => t.status === "pending" || t.status === "overdue") ? "idle" : "inactive");
  const activityLabel = activity === "active" ? "Ativo" : activity === "idle" ? "Ausente" : "Inativo";
  const activityDot = activity === "active" ? "bg-success" : activity === "idle" ? "bg-warning" : "bg-muted-foreground/40";

  const getInitials = (name: string | null) =>
    name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  const handleCobrar = async () => {
    if (!userId) return;
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title: "Cobrança do gestor",
      message: `${myProfile?.full_name || "Seu gestor"} está acompanhando suas tarefas. Verifique suas pendências.`,
      type: "task_assigned",
    });
    if (error) {
      toast({ title: "Erro ao enviar cobrança", variant: "destructive" });
    } else {
      toast({ title: "Cobrança enviada", description: "O analista foi notificado." });
    }
  };

  // Sorted tasks for list view
  const sortedTasks = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...tasks].sort((a, b) => {
      let cmp = 0;
      if (sortField === "priority") {
        cmp = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      } else if (sortField === "due_date") {
        cmp = (a.due_date || "").localeCompare(b.due_date || "");
      } else {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [tasks, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter((t) => {
      const start = t.start_date?.slice(0, 10);
      const due = t.due_date?.slice(0, 10);
      return start === today || due === today;
    });
  }, [tasks]);

  const recentCompleted = useMemo(() =>
    tasks
      .filter((t) => t.status === "completed")
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 5),
  [tasks]);

  // Kanban columns
  const kanbanColumns: { key: string; label: string; color: string }[] = [
    { key: "pending", label: "Pendente", color: "border-muted-foreground/30" },
    { key: "in_progress", label: "Em Andamento", color: "border-primary" },
    { key: "completed", label: "Concluída", color: "border-success" },
    { key: "overdue", label: "Atrasada", color: "border-destructive" },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!analyst) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/team/monitoring")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <p className="mt-4 text-muted-foreground">Analista não encontrado.</p>
      </div>
    );
  }

  const deptName = departments.find((d) => d.id === analyst.department_id)?.name;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/team/monitoring")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(analyst.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${activityDot}`} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{analyst.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {analyst.position || "Analista"} {deptName ? `· ${deptName}` : ""} · {activityLabel}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={() => setShowTaskForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
          </Button>
          <Button size="sm" variant="outline" onClick={handleCobrar}>
            <Bell className="h-4 w-4 mr-1" /> Cobrar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground mt-1">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{inProgress}</p>
          <p className="text-xs text-muted-foreground mt-1">Em execução</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{overdue}</p>
          <p className="text-xs text-muted-foreground mt-1">Atrasadas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-success">{productivity}%</p>
          <p className="text-xs text-muted-foreground mt-1">Produtividade</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumo"><BarChart3 className="h-4 w-4 mr-1.5" />Resumo</TabsTrigger>
          <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-1.5" />Kanban</TabsTrigger>
          <TabsTrigger value="lista"><ListTodo className="h-4 w-4 mr-1.5" />Lista</TabsTrigger>
          <TabsTrigger value="calendario"><CalendarIcon className="h-4 w-4 mr-1.5" />Calendário</TabsTrigger>
        </TabsList>

        {/* Resumo */}
        <TabsContent value="resumo" className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Tarefas de Hoje</h3>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa para hoje.</p>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((t) => (
                  <Card key={t.id} className="cursor-pointer hover:shadow-sm" onClick={() => setSelectedTask(t)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Badge className={statusColors[t.status] + " text-xs"}>{statusLabels[t.status]}</Badge>
                      <span className="text-sm text-foreground truncate flex-1">{t.title}</span>
                      {t.due_date && <span className="text-xs text-muted-foreground">{formatStoredDate(t.due_date, "time")}</span>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Últimas Concluídas</h3>
            {recentCompleted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa concluída recentemente.</p>
            ) : (
              <div className="space-y-2">
                {recentCompleted.map((t) => (
                  <Card key={t.id} className="cursor-pointer hover:shadow-sm" onClick={() => setSelectedTask(t)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">{t.title}</span>
                      <span className="text-xs text-muted-foreground">{formatStoredDate(t.updated_at, "short-date")}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Kanban */}
        <TabsContent value="kanban">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kanbanColumns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.key);
              return (
                <div key={col.key} className={`rounded-lg border-t-2 ${col.color} bg-muted/30 p-3 space-y-2`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{col.label}</span>
                    <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                  </div>
                  {colTasks.map((t) => (
                    <Card key={t.id} className="cursor-pointer hover:shadow-sm" onClick={() => setSelectedTask(t)}>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                        {t.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">{formatStoredDate(t.due_date, "short-date")}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {colTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Vazio</p>}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Lista */}
        <TabsContent value="lista">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("status")}>
                    Status {sortField === "status" && (sortDir === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("priority")}>
                    Prioridade {sortField === "priority" && (sortDir === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("due_date")}>
                    Prazo {sortField === "due_date" && (sortDir === "asc" ? "↑" : "↓")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTasks.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelectedTask(t)}>
                    <TableCell><Badge className={statusColors[t.status] + " text-xs"}>{statusLabels[t.status]}</Badge></TableCell>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-sm">{priorityLabels[t.priority] || t.priority}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.due_date ? formatStoredDate(t.due_date, "date") : "—"}</TableCell>
                  </TableRow>
                ))}
                {sortedTasks.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma tarefa</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Calendário */}
        <TabsContent value="calendario">
          <TaskCalendar tasks={tasks} onTaskClick={setSelectedTask} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          members={members}
          departments={departments}
          onEdit={() => {}}
          onRefresh={fetchData}
        />
      )}

      <TaskForm
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        members={members}
        departments={departments}
        onSaved={fetchData}
        editing={null}
      />
    </div>
  );
}
