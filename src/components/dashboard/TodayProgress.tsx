import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CalendarIcon } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface TodayProgressProps {
  tasks: Task[];
  todayCompleted: number;
  todayTotal: number;
  todayProgress: number;
  getName: (id: string | null) => string;
  onTaskClick?: (task: Task) => void;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-muted-foreground", label: "Pendente" },
  in_progress: { color: "bg-primary", label: "Em Andamento" },
  completed: { color: "bg-green-500", label: "Concluída" },
  overdue: { color: "bg-destructive", label: "Atrasada" },
};

export default function TodayProgress({
  tasks,
  todayCompleted,
  todayTotal,
  todayProgress,
  getName,
  onTaskClick,
}: TodayProgressProps) {
  // Sort: in_progress first, then pending, then completed
  const sorted = [...tasks].sort((a, b) => {
    const order: Record<string, number> = { in_progress: 0, pending: 1, overdue: 2, completed: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Progresso do Dia</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{todayCompleted}/{todayTotal}</span>
        </div>
        {todayTotal > 0 && <Progress value={todayProgress} className="mt-2 h-1.5" />}
      </CardHeader>
      <CardContent className="flex-1">
        {todayTotal === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa hoje</p>
        ) : (
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {sorted.map((task) => {
              const cfg = statusConfig[task.status] || statusConfig.pending;
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.color}`} />
                  <span className="text-sm font-medium truncate flex-1">{task.title}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{getName(task.assigned_to)}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
