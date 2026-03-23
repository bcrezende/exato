import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, XCircle, ListTodo } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface DelayRecord {
  id: string;
  task_id: string;
  log_type: string;
  created_at: string;
}

interface AdminOverviewCardsProps {
  periodTasks: Task[];
  periodDelays: DelayRecord[];
  today: Date;
}

export default function AdminOverviewCards({ periodTasks, periodDelays, today }: AdminOverviewCardsProps) {
  const metrics = useMemo(() => {
    const todayISO = today.toISOString();
    const totalTasks = periodTasks.length;

    const lateStartTaskIds = new Set(
      periodDelays.filter(d => d.log_type === "inicio_atrasado").map(d => d.task_id)
    );
    const lateCompletionTaskIds = new Set(
      periodDelays.filter(d => d.log_type === "conclusao_atrasada").map(d => d.task_id)
    );

    const completedTasks = periodTasks.filter(t => t.status === "completed");
    const onTime = completedTasks.filter(
      t => !lateStartTaskIds.has(t.id) && !lateCompletionTaskIds.has(t.id)
    ).length;

    const lateStarts = lateStartTaskIds.size;
    const lateCompletions = lateCompletionTaskIds.size;

    const notCompleted = periodTasks.filter(
      t => t.status !== "completed" && t.due_date && t.due_date < todayISO
    ).length;

    return { totalTasks, onTime, lateStarts, lateCompletions, notCompleted };
  }, [periodTasks, periodDelays, today]);

  const cards = [
    { label: "Total de Tarefas", value: metrics.totalTasks, icon: ListTodo, color: "text-primary" },
    { label: "Feitas no Prazo", value: metrics.onTime, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Início Atrasado", value: metrics.lateStarts, icon: Clock, color: "text-amber-500" },
    { label: "Conclusão Atrasada", value: metrics.lateCompletions, icon: AlertTriangle, color: "text-orange-500" },
    { label: "Não Concluídas", value: metrics.notCompleted, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
