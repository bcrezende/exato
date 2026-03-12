import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { updateTaskStatus } from "@/lib/task-utils";
import { Pencil, Trash2, Clock, CalendarDays, User, Flag, Building2, Timer } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type Profile = Tables<"profiles">;
type Department = Tables<"departments">;

const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada" };
const recurrenceLabels: Record<string, string> = { none: "Nenhuma", daily: "Diária", weekly: "Semanal", monthly: "Mensal", yearly: "Anual" };

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
};

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  return `${hours}h ${minutes}min`;
}

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Profile[];
  departments: Department[];
  onEdit: (task: Task) => void;
  onRefresh: () => void;
}

export default function TaskDetailModal({ task, open, onOpenChange, members, departments, onEdit, onRefresh }: TaskDetailModalProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const canManage = role === "admin" || role === "manager";
  const isAssigned = task?.assigned_to === user?.id;
  const [executionTime, setExecutionTime] = useState<string | null>(null);

  useEffect(() => {
    if (!task || !open) { setExecutionTime(null); return; }
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("task_time_logs")
        .select("action, created_at")
        .eq("task_id", task.id)
        .order("created_at", { ascending: true });
      if (!data || data.length === 0) { setExecutionTime(null); return; }
      const started = data.find(l => l.action === "started" || l.action === "started_late");
      const completed = data.find(l => l.action === "completed");
      const lateTag = started?.action === "started_late" ? " (iniciada com atraso)" : "";
      if (started && completed) {
        const diff = new Date(completed.created_at).getTime() - new Date(started.created_at).getTime();
        setExecutionTime(formatDuration(diff) + lateTag);
      } else if (started && task.status === "in_progress") {
        const diff = Date.now() - new Date(started.created_at).getTime();
        setExecutionTime(`${formatDuration(diff)} (em andamento)${lateTag}`);
      } else {
        setExecutionTime(null);
      }
    };
    fetchLogs();
  }, [task?.id, open, task?.status]);

  if (!task) return null;

  const assignedName = members.find(m => m.id === task.assigned_to)?.full_name || null;
  const deptName = departments.find(d => d.id === task.department_id)?.name || null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTaskStatus(task.id, newStatus as any, task, task.status);
      toast({ title: "Status atualizado!" });
      onRefresh();
    } catch {
      toast({ variant: "destructive", title: "Erro ao atualizar status" });
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Tarefa removida" });
    onOpenChange(false);
    onRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg leading-tight">{task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={statusColors[task.status]}>{statusLabels[task.status]}</Badge>
            {task.recurrence_type !== "none" && <Badge variant="outline">{recurrenceLabels[task.recurrence_type]}</Badge>}
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
          )}

          <div className="space-y-3 text-sm">
            {assignedName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span>Responsável: <span className="text-foreground font-medium">{assignedName}</span></span>
              </div>
            )}
            {deptName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>Setor: <span className="text-foreground font-medium">{deptName}</span></span>
              </div>
            )}
            {task.start_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>Início: <span className="text-foreground font-medium">{format(new Date(task.start_date), "dd/MM/yyyy HH:mm")}</span></span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Término: <span className="text-foreground font-medium">{format(new Date(task.due_date), "dd/MM/yyyy HH:mm")}</span></span>
              </div>
            )}
            {executionTime && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Timer className="h-4 w-4 shrink-0" />
                <span>Tempo de execução: <span className="text-foreground font-medium">{executionTime}</span></span>
              </div>
            )}
          </div>

          {isAssigned && !canManage && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Atualizar Status</span>
              {(task.status === "pending" || task.status === "overdue") && (
                <Button size="sm" className="w-full" onClick={() => handleStatusChange("in_progress")}>
                  <Clock className="mr-2 h-4 w-4" /> {task.status === "overdue" ? "Iniciar (atrasada)" : "Iniciar"}
                </Button>
              )}
              {task.status === "in_progress" && (
                <Button size="sm" className="w-full bg-success text-success-foreground hover:bg-success/90" onClick={() => handleStatusChange("completed")}>
                  <Flag className="mr-2 h-4 w-4" /> Concluir
                </Button>
              )}
              {task.status === "completed" && (
                <div className="text-center space-y-1">
                  <Badge className="bg-success/10 text-success">Concluída</Badge>
                  <p className="text-xs text-muted-foreground">Para alterar, solicite ao gerente</p>
                </div>
              )}
            </div>
          )}
        </div>

        {canManage && (
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); onEdit(task); }}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}