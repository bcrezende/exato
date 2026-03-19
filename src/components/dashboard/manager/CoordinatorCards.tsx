import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, ExternalLink } from "lucide-react";
import { FormulaTooltip } from "@/components/ui/formula-tooltip";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface CoordinatorData {
  id: string;
  name: string;
  analystIds: string[];
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  onTimeRate: number;
}

interface CoordinatorCardsProps {
  tasks: Task[];
  profiles: { id: string; full_name: string | null; department_id: string | null }[];
  coordinatorLinks: { coordinator_id: string; analyst_id: string }[];
  coordinatorIds: string[];
}

export default function CoordinatorCards({ tasks, profiles, coordinatorLinks, coordinatorIds }: CoordinatorCardsProps) {
  const navigate = useNavigate();

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach(p => m.set(p.id, p.full_name || "Sem nome"));
    return m;
  }, [profiles]);

  const coordinators = useMemo<CoordinatorData[]>(() => {
    return coordinatorIds.map(cId => {
      const analystIds = coordinatorLinks
        .filter(l => l.coordinator_id === cId)
        .map(l => l.analyst_id);

      const teamIds = [cId, ...analystIds];
      const teamTasks = tasks.filter(t => t.assigned_to && teamIds.includes(t.assigned_to));
      const completed = teamTasks.filter(t => t.status === "completed");
      const overdue = teamTasks.filter(t =>
        t.status === "overdue" || (t.status !== "completed" && t.status !== "in_progress" && t.due_date && new Date(t.due_date) < new Date())
      );
      const onTimeRate = teamTasks.length > 0
        ? Math.round(((teamTasks.length - overdue.length) / teamTasks.length) * 100)
        : 100;

      return {
        id: cId,
        name: profileMap.get(cId) || "Coordenador",
        analystIds,
        totalTasks: teamTasks.length,
        completedTasks: completed.length,
        overdueTasks: overdue.length,
        onTimeRate,
      };
    }).sort((a, b) => b.onTimeRate - a.onTimeRate);
  }, [coordinatorIds, coordinatorLinks, tasks, profileMap]);

  if (coordinators.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum coordenador vinculado ao setor
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return "text-green-600 dark:text-green-400";
    if (rate >= 75) return "text-yellow-600 dark:text-yellow-400";
    return "text-destructive";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return "[&>div]:bg-green-500";
    if (rate >= 75) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-destructive";
  };

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {coordinators.map(coord => (
        <Card key={coord.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {getInitials(coord.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold truncate">{coord.name}</CardTitle>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">{coord.analystIds.length} analista{coord.analystIds.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">No prazo</span>
              <span className={`font-bold ${getStatusColor(coord.onTimeRate)}`}>
                {coord.onTimeRate}%
              </span>
            </div>
            <Progress value={coord.onTimeRate} className={`h-2 ${getProgressColor(coord.onTimeRate)}`} />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{coord.totalTasks} tarefas</span>
              <span>{coord.completedTasks} concluídas</span>
              {coord.overdueTasks > 0 && (
                <span className="text-destructive font-medium">{coord.overdueTasks} atrasadas</span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={() => navigate("/team-monitoring")}
            >
              <ExternalLink className="h-3 w-3" />
              Ver Equipe
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
