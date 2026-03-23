import { Card, CardContent } from "@/components/ui/card";
import { Building2, ListTodo, AlertTriangle, TrendingDown } from "lucide-react";
import { FormulaTooltip } from "@/components/ui/formula-tooltip";

interface AdminKpiCardsProps {
  activeSectors: number;
  totalTasks: number;
  overdueTasks: number;
  avgDelayRate: number;
  period: string;
}

export default function AdminKpiCards({ activeSectors, totalTasks, overdueTasks, avgDelayRate }: AdminKpiCardsProps) {
  const delayColor = avgDelayRate < 10
    ? "text-green-600 dark:text-green-400"
    : avgDelayRate <= 20
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-destructive";

  const delayBg = avgDelayRate < 10
    ? "bg-green-50 dark:bg-green-950/30"
    : avgDelayRate <= 20
      ? "bg-yellow-50 dark:bg-yellow-950/30"
      : "bg-destructive/10";

  const cards = [
    {
      label: "Setores Ativos",
      value: activeSectors,
      icon: Building2,
      iconClass: "text-primary",
      bgClass: "bg-primary/10",
    },
    {
      label: "Total de Tarefas",
      value: totalTasks,
      icon: ListTodo,
      iconClass: "text-primary",
      bgClass: "bg-primary/10",
    },
    {
      label: "Atrasadas Hoje",
      value: overdueTasks,
      icon: AlertTriangle,
      iconClass: "text-destructive",
      bgClass: "bg-destructive/10",
    },
    {
      label: "% Atraso Médio",
      value: `${avgDelayRate.toFixed(1)}%`,
      icon: TrendingDown,
      iconClass: delayColor,
      bgClass: delayBg,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${c.bgClass}`}>
                <c.icon className={`h-5 w-5 ${c.iconClass}`} />
              </div>
              <div>
                {c.label === "% Atraso Médio" ? (
                  <FormulaTooltip formula="Tarefas atrasadas ÷ Total de tarefas × 100">
                    <p className="text-2xl font-bold">{c.value}</p>
                  </FormulaTooltip>
                ) : (
                  <p className="text-2xl font-bold">{c.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
