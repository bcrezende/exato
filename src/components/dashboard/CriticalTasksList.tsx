import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { differenceInDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface CriticalTasksListProps {
  overdueTasks: Task[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  getName: (id: string | null) => string;
  today: Date;
}

const priorityLabels: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

export default function CriticalTasksList({
  overdueTasks,
  todayTasks,
  upcomingTasks,
  getName,
  today,
}: CriticalTasksListProps) {
  // Pick top 3 most critical: overdue first, then today pending/in_progress, then upcoming
  const candidates: (Task & { urgencyLabel: string })[] = [];

  for (const t of overdueTasks) {
    if (candidates.length >= 3) break;
    const days = t.due_date ? Math.max(0, differenceInDays(today, new Date(t.due_date))) : 0;
    candidates.push({ ...t, urgencyLabel: days === 0 ? "Vence hoje" : `${days}d atraso` });
  }

  for (const t of todayTasks.filter(t => t.status !== "completed")) {
    if (candidates.length >= 3) break;
    if (candidates.some(c => c.id === t.id)) continue;
    candidates.push({ ...t, urgencyLabel: "Hoje" });
  }

  for (const t of upcomingTasks) {
    if (candidates.length >= 3) break;
    if (candidates.some(c => c.id === t.id)) continue;
    const days = t.due_date ? differenceInDays(new Date(t.due_date), today) : 0;
    candidates.push({ ...t, urgencyLabel: `${days}d restantes` });
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-base">Tarefas Críticas</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa crítica</p>
        ) : (
          <div className="space-y-2">
            {candidates.map((task) => (
              <div key={task.id} className="flex items-center gap-2.5 p-2.5 rounded-md border hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{task.title}</h4>
                  <p className="text-[11px] text-muted-foreground">{getName(task.assigned_to)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {task.priority === "high" && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Alta</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">{task.urgencyLabel}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
