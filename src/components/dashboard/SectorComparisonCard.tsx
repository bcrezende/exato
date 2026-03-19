import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Building2 } from "lucide-react";
import { FormulaTooltip } from "@/components/ui/formula-tooltip";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface SectorComparisonCardProps {
  tasks: Task[];
  departments: { id: string; name: string }[];
}

interface SectorStats {
  id: string;
  name: string;
  total: number;
  completed: number;
  overdue: number;
  unassigned: number;
  onTimeRate: number;
}

export default function SectorComparisonCard({ tasks, departments }: SectorComparisonCardProps) {
  const sectors = useMemo<SectorStats[]>(() => {
    return departments.map(dept => {
      const deptTasks = tasks.filter(t => t.department_id === dept.id);
      const total = deptTasks.length;
      const completed = deptTasks.filter(t => t.status === "completed").length;
      const overdue = deptTasks.filter(t =>
        t.status === "overdue" ||
        (t.status !== "completed" && t.status !== "in_progress" && t.due_date && t.due_date < new Date().toISOString())
      ).length;
      const unassigned = deptTasks.filter(t => !t.assigned_to).length;
      const onTimeRate = total > 0 ? ((total - overdue) / total) * 100 : 100;

      return { id: dept.id, name: dept.name, total, completed, overdue, unassigned, onTimeRate };
    }).filter(s => s.total > 0).sort((a, b) => a.onTimeRate - b.onTimeRate);
  }, [tasks, departments]);

  const bottlenecks = useMemo(() => {
    const issues: string[] = [];
    const worstSector = sectors.length > 0 ? sectors[0] : null;
    if (worstSector && worstSector.onTimeRate < 80) {
      issues.push(`${worstSector.name}: ${Math.round(100 - worstSector.onTimeRate)}% de atraso`);
    }
    sectors.forEach(s => {
      if (s.unassigned > 0) issues.push(`${s.name}: ${s.unassigned} tarefa(s) sem responsável`);
    });
    return issues;
  }, [sectors]);

  if (sectors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum setor com tarefas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bottlenecks.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Gargalos Identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {bottlenecks.map((b, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Comparativo de Setores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sectors.map(sector => (
              <div key={sector.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{sector.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={sector.onTimeRate >= 80 ? "secondary" : "destructive"} className="text-[10px]">
                      {Math.round(sector.onTimeRate)}% no prazo
                    </Badge>
                  </div>
                </div>
                <Progress
                  value={sector.onTimeRate}
                  className="h-2"
                />
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  <span>{sector.total} total</span>
                  <span className="text-success">{sector.completed} concluídas</span>
                  {sector.overdue > 0 && <span className="text-destructive">{sector.overdue} atrasadas</span>}
                  {sector.unassigned > 0 && <span className="text-warning">{sector.unassigned} sem responsável</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
