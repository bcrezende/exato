import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, List, CalendarDays, LayoutGrid, Pencil, Trash2, X, User, Clock, Building2, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateTaskStatus } from "@/lib/task-utils";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import TaskCalendar from "@/components/tasks/TaskCalendar";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TaskForm from "@/components/tasks/TaskForm";

type Task = Tables<"tasks">;
type Profile = Tables<"profiles">;
type Department = Tables<"departments">;

const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada" };
const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
};
const recurrenceLabels: Record<string, string> = { none: "Nenhuma", daily: "Diária", weekly: "Semanal", monthly: "Mensal", yearly: "Anual" };

export default function Tasks() {
  const { user, role, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar">("kanban");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterRecurrence, setFilterRecurrence] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

  const canManage = role === "admin" || role === "manager";

  const fetchTasks = async () => {
    let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (role === "employee" && user) query = query.eq("assigned_to", user.id);
    const { data } = await query;
    if (data) setTasks(data);
  };

  const fetchMembers = async () => {
    if (!currentProfile?.company_id) return;
    const { data } = await supabase.from("profiles").select("*").eq("company_id", currentProfile.company_id);
    if (data) setMembers(data);
  };

  const fetchDepartments = async () => {
    if (!currentProfile?.company_id) return;
    const { data } = await supabase.from("departments").select("*").eq("company_id", currentProfile.company_id).order("name");
    if (data) setDepartments(data);
  };

  useEffect(() => { if (user) { fetchTasks(); fetchMembers(); fetchDepartments(); } }, [user]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (task: Task) => { setEditing(task); setFormOpen(true); };
  const openDetail = (task: Task) => { setDetailTask(task); setDetailOpen(true); };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Tarefa removida" });
    fetchTasks();
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    await updateTaskStatus(taskId, newStatus as any, task);
    await fetchTasks();
  };

  const getMemberName = (id: string | null) => {
    if (!id) return "Não atribuída";
    return members.find((m) => m.id === id)?.full_name || "—";
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return null;
    return departments.find((d) => d.id === departmentId)?.name || null;
  };

  const hasActiveFilters = search || filterStatus !== "all" || filterDepartment !== "all" || filterAssignee !== "all" || filterRecurrence !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterDepartment("all");
    setFilterAssignee("all");
    setFilterRecurrence("all");
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterDepartment !== "all" && t.department_id !== filterDepartment) return false;
      if (filterAssignee !== "all" && t.assigned_to !== filterAssignee) return false;
      if (filterRecurrence !== "all" && t.recurrence_type !== filterRecurrence) return false;
      return true;
    });
  }, [tasks, search, filterStatus, filterDepartment, filterAssignee, filterRecurrence]);

  const kanbanColumns = ["pending", "in_progress", "completed", "overdue"] as const;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie as tarefas da sua equipe</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            <Button variant={viewMode === "kanban" ? "default" : "ghost"} size="sm" className="rounded-none rounded-l-lg" onClick={() => setViewMode("kanban")}>
              <LayoutGrid className="mr-1.5 h-4 w-4" /> Kanban
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("list")}>
              <List className="mr-1.5 h-4 w-4" /> Lista
            </Button>
            <Button variant={viewMode === "calendar" ? "default" : "ghost"} size="sm" className="rounded-none rounded-r-lg" onClick={() => setViewMode("calendar")}>
              <CalendarDays className="mr-1.5 h-4 w-4" /> Calendário
            </Button>
          </div>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar tarefas..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[160px]">
                <Building2 className="mr-1.5 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-[170px]">
                <User className="mr-1.5 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.id}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterRecurrence} onValueChange={setFilterRecurrence}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Recorrência" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="mr-1 h-4 w-4" /> Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kanbanColumns.map((status) => {
            const columnTasks = filtered.filter((t) => {
              if (status === "overdue") return (t.status === "overdue") || (t.due_date && t.due_date < new Date().toISOString() && t.status !== "completed");
              if (status === "pending") return t.status === "pending" && !(t.due_date && t.due_date < new Date().toISOString());
              if (status === "in_progress") return t.status === "in_progress" && !(t.due_date && t.due_date < new Date().toISOString());
              return t.status === status;
            });
            const dotColor = status === "pending" ? "bg-muted-foreground" : status === "in_progress" ? "bg-primary" : status === "completed" ? "bg-success" : "bg-destructive";
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                  <h3 className="text-sm font-semibold">{statusLabels[status]}</h3>
                  <Badge variant="secondary" className="ml-auto text-xs">{columnTasks.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {columnTasks.map((task) => {
                    const deptName = getDepartmentName(task.department_id);
                    return (
                      <Card
                        key={task.id}
                        className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                        onClick={() => openDetail(task)}
                      >
                        <CardContent className="p-4 space-y-3">
                          <h4 className="font-medium leading-tight text-sm">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {deptName && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <Building2 className="mr-1 h-3 w-3" />{deptName}
                              </Badge>
                            )}
                            {task.recurrence_type !== "none" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {recurrenceLabels[task.recurrence_type]}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">{getMemberName(task.assigned_to)}</span>
                            </div>
                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{format(new Date(task.due_date), "dd/MM")}</span>
                              </div>
                            )}
                          </div>
                          {/* Quick actions */}
                          <div className="flex items-center gap-1 pt-1 border-t" onClick={(e) => e.stopPropagation()}>
                            {role === "employee" && task.assigned_to === user?.id && (
                              <>
                                {task.status === "pending" && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => handleStatusChange(task.id, "in_progress")}>Iniciar</Button>
                                )}
                                {task.status === "in_progress" && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs flex-1 text-success" onClick={() => handleStatusChange(task.id, "completed")}>Concluir</Button>
                                )}
                              </>
                            )}
                            {canManage && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(task)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(task.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
      {viewMode === "calendar" && (
        <TaskCalendar tasks={filtered} onTaskClick={openDetail} />
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {filtered.map((task) => {
            const deptName = getDepartmentName(task.department_id);
            return (
              <Card key={task.id} className="transition-shadow hover:shadow-md cursor-pointer" onClick={() => openDetail(task)}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{task.title}</h3>
                      <Badge className={statusColors[task.status]} variant="secondary">{statusLabels[task.status]}</Badge>
                      {deptName && <Badge variant="outline" className="text-xs">{deptName}</Badge>}
                      {task.recurrence_type !== "none" && <Badge variant="outline" className="text-xs">{recurrenceLabels[task.recurrence_type]}</Badge>}
                    </div>
                    {task.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{task.description}</p>}
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {getMemberName(task.assigned_to)}</span>
                      {task.start_date && <span>Início: {format(new Date(task.start_date), "dd/MM/yyyy HH:mm")}</span>}
                      {task.due_date && <span>Término: {format(new Date(task.due_date), "dd/MM/yyyy HH:mm")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {(role === "employee" && task.assigned_to === user?.id) && (
                      <>
                        {task.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(task.id, "in_progress")}>Iniciar</Button>
                        )}
                        {task.status === "in_progress" && (
                          <Button size="sm" variant="outline" className="text-success border-success hover:bg-success/10" onClick={() => handleStatusChange(task.id, "completed")}>Concluir</Button>
                        )}
                        {task.status === "completed" && (
                          <Badge className="bg-success/10 text-success">Concluída</Badge>
                        )}
                      </>
                    )}
                    {canManage && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(task)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              Nenhuma tarefa encontrada
            </div>
          )}
        </div>
      )}

      <TaskForm open={formOpen} onOpenChange={setFormOpen} editing={editing} members={members} departments={departments} onSaved={fetchTasks} />
      <TaskDetailModal task={detailTask} open={detailOpen} onOpenChange={setDetailOpen} members={members} departments={departments} onEdit={openEdit} onRefresh={fetchTasks} />
    </div>
  );
}
