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
  const [localTask, setLocalTask] = useState<Task | null>(task);
  const [statusLoading, setStatusLoading] = useState(false);
  const canManage = role === "admin" || role === "manager";
  const isCreator = localTask?.created_by === user?.id;
  const isAssigned = localTask?.assigned_to === user?.id;
  const [executionTime, setExecutionTime] = useState<string | null>(null);

  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  useEffect(() => {
    if (!localTask || !open) { setExecutionTime(null); return; }
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("task_time_logs")
        .select("action, created_at")
        .eq("task_id", localTask.id)
        .order("created_at", { ascending: true });
      if (!data || data.length === 0) { setExecutionTime(null); return; }
      const started = data.find(l => l.action === "started" || l.action === "started_late");
      const completed = data.find(l => l.action === "completed");
      const lateTag = started?.action === "started_late" ? " (iniciada com atraso)" : "";
      if (started && completed) {
        const diff = new Date(completed.created_at).getTime() - new Date(started.created_at).getTime();
        setExecutionTime(formatDuration(diff) + lateTag);
      } else if (started && localTask.status === "in_progress") {
        const diff = Date.now() - new Date(started.created_at).getTime();
        setExecutionTime(`${formatDuration(diff)} (em andamento)${lateTag}`);
      } else {
        setExecutionTime(null);
      }
    };
    fetchLogs();
  }, [localTask?.id, open, localTask?.status]);

  if (!localTask) return null;

  const assignedName = members.find(m => m.id === localTask.assigned_to)?.full_name || null;
  const deptName = departments.find(d => d.id === localTask.department_id)?.name || null;

  const handleStatusChange = async (newStatus: string) => {
    const previousTask = localTask;
    // Optimistic update — instant feedback
    setLocalTask({ ...localTask, status: newStatus as any });
    setStatusLoading(true);
    try {
      await updateTaskStatus(localTask.id, newStatus as any, previousTask);
      toast({ title: "Status atualizado!" });
      onRefresh();
    } catch {
      // Revert on error
      setLocalTask(previousTask);
      toast({ variant: "destructive", title: "Erro ao atualizar status" });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("tasks").delete().eq("id", localTask.id);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Tarefa removida" });
    onOpenChange(false);
    onRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg leading-tight">{localTask.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={statusColors[localTask.status]}>{statusLabels[localTask.status]}</Badge>
            {localTask.recurrence_type !== "none" && <Badge variant="outline">{recurrenceLabels[localTask.recurrence_type]}</Badge>}
          </div>

          {localTask.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{localTask.description}</p>
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
            {localTask.start_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>Início: <span className="text-foreground font-medium">{format(new Date(localTask.start_date), "dd/MM/yyyy HH:mm")}</span></span>
              </div>
            )}
            {localTask.due_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Término: <span className="text-foreground font-medium">{format(new Date(localTask.due_date), "dd/MM/yyyy HH:mm")}</span></span>
              </div>
            )}
            {executionTime && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Timer className="h-4 w-4 shrink-0" />
                <span>Tempo de execução: <span className="text-foreground font-medium">{executionTime}</span></span>
              </div>
            )}
          </div>

          {isAssigned && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Atualizar Status</span>
              {(localTask.status === "pending" || localTask.status === "overdue") && (
                <Button size="sm" className="w-full" disabled={statusLoading} onClick={() => handleStatusChange("in_progress")}>
                  <Clock className="mr-2 h-4 w-4" /> {localTask.status === "overdue" ? "Iniciar (atrasada)" : "Iniciar"}
                </Button>
              )}
              {localTask.status === "in_progress" && (
                <Button size="sm" className="w-full bg-success text-success-foreground hover:bg-success/90" disabled={statusLoading} onClick={() => handleStatusChange("completed")}>
                  <Flag className="mr-2 h-4 w-4" /> Concluir
                </Button>
              )}
              {localTask.status === "completed" && (
                <div className="text-center space-y-1">
                  <Badge className="bg-success/10 text-success">Concluída</Badge>
                  <p className="text-xs text-muted-foreground">Para alterar, solicite ao gerente</p>
                </div>
              )}
            </div>
          )}
        </div>

        {(canManage || isCreator) && (
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); onEdit(localTask); }}>
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