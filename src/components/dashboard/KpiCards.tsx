import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ListTodo, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface KpiCardsProps {
  todayTotal: number;
  todayInProgress: number;
  todayCompleted: number;
  overdueCount: number;
  todayProgress: number;
  todayTasks: Task[];
  overdueTasks: Task[];
  getName: (id: string | null) => string;
  onTaskClick?: (task: Task) => void;
}

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  in_progress: { label: "Em Andamento", variant: "default" },
  completed: { label: "Concluída", variant: "outline" },
  overdue: { label: "Atrasada", variant: "destructive" },
};

export default function KpiCards({
  todayTotal,
  todayInProgress,
  todayCompleted,
  overdueCount,
  todayProgress,
  todayTasks,
  overdueTasks,
  getName,
  onTaskClick,
}: KpiCardsProps) {
  const [modalData, setModalData] = useState<{ title: string; tasks: Task[] } | null>(null);

  const openModal = (title: string, tasks: Task[]) => {
    if (tasks.length > 0) setModalData({ title, tasks });
  };

  return (
    <>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => openModal("Tarefas de Hoje", todayTasks)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tarefas Hoje</CardTitle>
            <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{todayTotal}</div>
            <p className="text-[11px] text-muted-foreground">{todayProgress}% concluídas</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => openModal("Em Andamento", todayTasks.filter(t => t.status === "in_progress"))}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Em Andamento</CardTitle>
            <Clock className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{todayInProgress}</div>
            <p className="text-[11px] text-muted-foreground">sendo executadas</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => openModal("Concluídas Hoje", todayTasks.filter(t => t.status === "completed"))}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Concluídas</CardTitle>
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{todayCompleted}</div>
            <p className="text-[11px] text-muted-foreground">de {todayTotal} do dia</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer hover:bg-muted/30 transition-colors ${overdueCount > 0 ? "border-destructive/50 bg-destructive/5 hover:bg-destructive/10" : ""}`}
          onClick={() => openModal("Tarefas Atrasadas", overdueTasks)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Atrasadas</CardTitle>
            <AlertTriangle className={`h-3.5 w-3.5 ${overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className={`text-xl font-bold ${overdueCount > 0 ? "text-destructive" : ""}`}>{overdueCount}</div>
            <p className="text-[11px] text-muted-foreground">requerem atenção</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!modalData} onOpenChange={(open) => !open && setModalData(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{modalData?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 overflow-y-auto flex-1">
            {modalData?.tasks.map((task) => {
              const sb = statusBadge[task.status] || statusBadge.pending;
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-md border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setModalData(null);
                    onTaskClick?.(task);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{task.title}</h4>
                    <p className="text-[11px] text-muted-foreground">{getName(task.assigned_to)}</p>
                  </div>
                  <Badge variant={sb.variant} className="text-[10px] h-5 shrink-0">{sb.label}</Badge>
                </div>
              );
            })}
            {modalData?.tasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
