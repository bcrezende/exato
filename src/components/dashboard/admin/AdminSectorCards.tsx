import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2 } from "lucide-react";
import { FormulaTooltip } from "@/components/ui/formula-tooltip";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type Profile = { id: string; full_name: string | null; department_id: string | null };

interface AdminSectorCardsProps {
  tasks: Task[];
  departments: { id: string; name: string }[];
  profiles: Profile[];
}

export default function AdminSectorCards({ tasks, departments, profiles }: AdminSectorCardsProps) {
  const sectors = useMemo(() => {
    return departments.map(dept => {
      const deptTasks = tasks.filter(t => t.department_id === dept.id);
      const total = deptTasks.length;
      const completed = deptTasks.filter(t => t.status === "completed").length;
      const overdue = deptTasks.filter(t => t.status === "overdue" || (t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date())).length;
      const inProgress = deptTasks.filter(t => t.status === "in_progress").length;
      const onTimeRate = total > 0 ? Math.round(((completed) / total) * 100) : 0;

      // Top 3 analysts by completed tasks
      const analystCounts = new Map<string, number>();
      deptTasks.filter(t => t.status === "completed" && t.assigned_to).forEach(t => {
        analystCounts.set(t.assigned_to!, (analystCounts.get(t.assigned_to!) || 0) + 1);
      });
      const topAnalysts = [...analystCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => ({
          name: profiles.find(p => p.id === id)?.full_name || "Sem nome",
          count,
        }));

      return { id: dept.id, name: dept.name, total, completed, overdue, inProgress, onTimeRate, topAnalysts };
    }).filter(s => s.total > 0);
  }, [tasks, departments, profiles]);

  if (sectors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum setor com tarefas no período
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sectors.map(sector => (
        <Card key={sector.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              {sector.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Conclusão</span>
              <Badge
                variant={sector.onTimeRate >= 80 ? "default" : sector.onTimeRate >= 50 ? "secondary" : "destructive"}
                className="text-[10px]"
              >
                {sector.onTimeRate}%
              </Badge>
            </div>
            <Progress value={sector.onTimeRate} className="h-2" />

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold">{sector.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{sector.completed}</p>
                <p className="text-[10px] text-muted-foreground">Concluídas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-destructive">{sector.overdue}</p>
                <p className="text-[10px] text-muted-foreground">Atrasadas</p>
              </div>
            </div>

            {sector.topAnalysts.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-[10px] text-muted-foreground mb-1">Top Analistas</p>
                {sector.topAnalysts.map((a, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="truncate">{a.name}</span>
                    <span className="text-muted-foreground">{a.count} ✓</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
