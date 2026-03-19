import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FormulaTooltip } from "@/components/ui/formula-tooltip";

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
  const sorted = [...tasks].sort((a, b) => {
    const order: Record<string, number> = { in_progress: 0, pending: 1, overdue: 2, completed: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });

  const remaining = todayTotal - todayCompleted;
  const donutData = todayTotal > 0
    ? [
        { name: "Concluídas", value: todayCompleted },
        { name: "Restantes", value: remaining },
      ]
    : [{ name: "Vazio", value: 1 }];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Progresso do Dia</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-4">
          {/* Donut Chart */}
          <div className="relative h-28 w-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={48}
                  dataKey="value"
                  strokeWidth={0}
                  startAngle={90}
                  endAngle={-270}
                >
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold">{todayProgress}%</span>
              <span className="text-[10px] text-muted-foreground">{todayCompleted}/{todayTotal}</span>
            </div>
          </div>

          {/* Task list */}
          <div className="flex-1 min-w-0">
            {todayTotal === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa hoje</p>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {sorted.slice(0, 6).map((task) => {
                  const cfg = statusConfig[task.status] || statusConfig.pending;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.color}`} />
                      <span className="text-sm truncate flex-1">{task.title}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{getName(task.assigned_to)}</span>
                    </div>
                  );
                })}
                {sorted.length > 6 && (
                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    +{sorted.length - 6} tarefas
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
