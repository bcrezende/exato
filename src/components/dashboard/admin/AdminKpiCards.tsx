import { Card, CardContent } from "@/components/ui/card";
import { Building2, ListTodo, AlertTriangle, TrendingDown } from "lucide-react";
import { FormulaTooltip } from "@/components/ui/formula-tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface AdminKpiCardsProps {
  activeSectors: number;
  totalTasks: number;
  overdueTasks: number;
  avgDelayRate: number;
  period: string;
  overdueByDepartment?: { name: string; count: number }[];
}

export default function AdminKpiCards({ activeSectors, totalTasks, overdueTasks, avgDelayRate, period, overdueByDepartment = [] }: AdminKpiCardsProps) {
  const overdueLabel = period === "today" ? "Atrasadas Hoje"
    : period === "yesterday" ? "Atrasadas Ontem"
    : "Atrasadas no Período";
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

  const simpleCards = [
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
      label: "% Atraso Médio",
      value: `${avgDelayRate.toFixed(1)}%`,
      icon: TrendingDown,
      iconClass: delayColor,
      bgClass: delayBg,
      hasTooltip: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {simpleCards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${c.bgClass}`}>
                <c.icon className={`h-5 w-5 ${c.iconClass}`} />
              </div>
              <div>
                {c.hasTooltip ? (
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

      {/* Card especial de Atrasadas com breakdown por setor */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueTasks}</p>
              <p className="text-xs text-muted-foreground">{overdueLabel}</p>
            </div>
          </div>
          {overdueByDepartment.length > 0 && (
            <>
              <Separator className="my-2" />
              <ScrollArea className="max-h-[80px]">
                <div className="space-y-1">
                  {overdueByDepartment.map((dept) => (
                    <div key={dept.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate mr-2">{dept.name}</span>
                      <span className="font-semibold text-destructive shrink-0">{dept.count}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
