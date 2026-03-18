import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { differenceInDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface OverdueSectionProps {
  overdueTasks: Task[];
  getName: (id: string | null) => string;
  today: Date;
  onTaskClick?: (task: Task) => void;
}

export default function OverdueSection({ overdueTasks, getName, today, onTaskClick }: OverdueSectionProps) {
  const getDaysLate = (dueDate: string | null) => {
    if (!dueDate) return 0;
    return Math.max(0, differenceInDays(today, new Date(dueDate)));
  };

  return (
    <Card className={overdueTasks.length > 0 ? "border-destructive/30" : "border-dashed"}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {overdueTasks.length > 0 ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          )}
          <CardTitle className="text-base">Atenção Imediata</CardTitle>
          {overdueTasks.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-[11px] h-5">{overdueTasks.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {overdueTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">Nenhuma tarefa atrasada ✓</p>
        ) : (
          <div className="space-y-1.5">
            {overdueTasks.map((task) => {
              const daysLate = getDaysLate(task.due_date);
              return (
                <div key={task.id} className="flex items-center gap-2.5 rounded-md border border-destructive/20 bg-destructive/5 p-2.5">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{task.title}</h4>
                    <p className="text-[11px] text-muted-foreground">{getName(task.assigned_to)}</p>
                  </div>
                  <Badge variant="destructive" className="text-[11px] h-5 shrink-0">
                    {daysLate === 0 ? "Vence hoje" : `${daysLate}d atraso`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
