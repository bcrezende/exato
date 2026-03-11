import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, List, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import TaskCalendar from "@/components/tasks/TaskCalendar";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TaskForm from "@/components/tasks/TaskForm";

type Task = Tables<"tasks">;
type Profile = Tables<"profiles">;
type Department = Tables<"departments">;

const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada" };
const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };
const statusColors: Record<string, string> = { pending: "bg-muted text-muted-foreground", in_progress: "bg-primary/10 text-primary", completed: "bg-success/10 text-success", overdue: "bg-destructive/10 text-destructive" };
const priorityColors: Record<string, string> = { low: "bg-muted text-muted-foreground", medium: "bg-warning/10 text-warning", high: "bg-destructive/10 text-destructive" };

export default function Tasks() {
  const { user, role, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
    await supabase.from("tasks").update({ status: newStatus as any }).eq("id", taskId);
    fetchTasks();
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return null;
    return departments.find((d) => d.id === departmentId)?.name || null;
  };

  const filtered = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()));

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
            <Button variant={viewMode === "calendar" ? "default" : "ghost"} size="sm" className="rounded-none rounded-l-lg" onClick={() => setViewMode("calendar")}>
              <CalendarDays className="mr-1.5 h-4 w-4" /> Calendário
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none rounded-r-lg" onClick={() => setViewMode("list")}>
              <List className="mr-1.5 h-4 w-4" /> Lista
            </Button>
          </div>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
            </Button>
          )}
        </div>
      </div>

      {/* Search (list mode) */}
      {viewMode === "list" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar tarefas..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <TaskCalendar tasks={tasks} onTaskClick={openDetail} />
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {filtered.map((task) => {
            const deptName = getDepartmentName(task.department_id);
            return (
              <Card key={task.id} className="transition-shadow hover:shadow-md cursor-pointer" onClick={() => openDetail(task)}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{task.title}</h3>
                      <Badge className={statusColors[task.status]} variant="secondary">{statusLabels[task.status]}</Badge>
                      <Badge className={priorityColors[task.priority]} variant="secondary">{priorityLabels[task.priority]}</Badge>
                      {deptName && <Badge variant="outline" className="text-xs">{deptName}</Badge>}
                    </div>
                    {task.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{task.description}</p>}
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
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

      {/* Task Form Modal */}
      <TaskForm open={formOpen} onOpenChange={setFormOpen} editing={editing} members={members} departments={departments} onSaved={fetchTasks} />

      {/* Task Detail Modal */}
      <TaskDetailModal task={detailTask} open={detailOpen} onOpenChange={setDetailOpen} members={members} departments={departments} onEdit={openEdit} onRefresh={fetchTasks} />
    </div>
  );
}
