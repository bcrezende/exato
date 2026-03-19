import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Clock, Building2, User } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface TimeLog {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  created_at: string;
}

interface RiskRadarProps {
  tasks: Task[];
  timeLogs: TimeLog[];
  profiles: Map<string, string>;
  departments: { id: string; name: string }[];
}

interface CriticalEmployee {
  id: string;
  name: string;
  overdueCount: number;
}

interface StalledTask {
  id: string;
  title: string;
  assignedName: string;
  stalledHours: number;
}

interface RiskySector {
  id: string;
  name: string;
  overdueRate: number;
}

export default function RiskRadar({ tasks, timeLogs, profiles, departments }: RiskRadarProps) {
  const [detailType, setDetailType] = useState<"employees" | "stalled" | "sectors" | null>(null);

  const criticalEmployees = useMemo<CriticalEmployee[]>(() => {
    const counts = new Map<string, number>();
    tasks.forEach(t => {
      if ((t.status === "overdue" || (t.status === "pending" && t.due_date && t.due_date < new Date().toISOString())) && t.assigned_to) {
        counts.set(t.assigned_to, (counts.get(t.assigned_to) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .filter(([, count]) => count >= 3)
      .map(([id, count]) => ({ id, name: profiles.get(id) || "Sem nome", overdueCount: count }))
      .sort((a, b) => b.overdueCount - a.overdueCount);
  }, [tasks, profiles]);

  const stalledTasks = useMemo<StalledTask[]>(() => {
    const now = Date.now();
    const eightHours = 8 * 60 * 60 * 1000;
    const inProgressTasks = tasks.filter(t => t.status === "in_progress");

    return inProgressTasks
      .map(task => {
        const startLog = timeLogs
          .filter(l => l.task_id === task.id && (l.action === "started" || l.action === "started_late"))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        if (!startLog) return null;
        const elapsed = now - new Date(startLog.created_at).getTime();
        if (elapsed < eightHours) return null;
        return {
          id: task.id,
          title: task.title,
          assignedName: profiles.get(task.assigned_to || "") || "Não atribuída",
          stalledHours: Math.round(elapsed / (60 * 60 * 1000)),
        };
      })
      .filter(Boolean) as StalledTask[];
  }, [tasks, timeLogs, profiles]);

  const riskySectors = useMemo<RiskySector[]>(() => {
    const sectorStats = new Map<string, { total: number; overdue: number }>();
    tasks.forEach(t => {
      if (!t.department_id) return;
      const stats = sectorStats.get(t.department_id) || { total: 0, overdue: 0 };
      stats.total++;
      if (t.status === "overdue" || (t.status !== "completed" && t.status !== "in_progress" && t.due_date && t.due_date < new Date().toISOString())) {
        stats.overdue++;
      }
      sectorStats.set(t.department_id, stats);
    });

    const rates = Array.from(sectorStats.entries()).map(([id, s]) => ({
      id,
      name: departments.find(d => d.id === id)?.name || "Desconhecido",
      overdueRate: s.total > 0 ? (s.overdue / s.total) * 100 : 0,
    }));

    const avgRate = rates.length > 0 ? rates.reduce((sum, r) => sum + r.overdueRate, 0) / rates.length : 0;
    return rates.filter(r => r.overdueRate > avgRate && r.overdueRate > 0).sort((a, b) => b.overdueRate - a.overdueRate);
  }, [tasks, departments]);

  const hasAnyRisk = criticalEmployees.length > 0 || stalledTasks.length > 0 || riskySectors.length > 0;

  if (!hasAnyRisk) return null;

  const indicators = [
    {
      key: "employees" as const,
      icon: <User className="h-4 w-4" />,
      label: "Funcionários críticos",
      count: criticalEmployees.length,
      color: criticalEmployees.length > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: criticalEmployees.length > 0 ? "bg-destructive/10 border-destructive/20" : "bg-muted/50",
      description: criticalEmployees.length > 0 ? `${criticalEmployees.length} com 3+ atrasos` : "Nenhum",
    },
    {
      key: "stalled" as const,
      icon: <Clock className="h-4 w-4" />,
      label: "Tarefas paradas",
      count: stalledTasks.length,
      color: stalledTasks.length > 0 ? "text-warning" : "text-muted-foreground",
      bgColor: stalledTasks.length > 0 ? "bg-warning/10 border-warning/20" : "bg-muted/50",
      description: stalledTasks.length > 0 ? `${stalledTasks.length} há 8h+ sem progresso` : "Nenhuma",
    },
    {
      key: "sectors" as const,
      icon: <Building2 className="h-4 w-4" />,
      label: "Setores em risco",
      count: riskySectors.length,
      color: riskySectors.length > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: riskySectors.length > 0 ? "bg-destructive/10 border-destructive/20" : "bg-muted/50",
      description: riskySectors.length > 0 ? `${riskySectors.length} acima da média` : "Nenhum",
    },
  ];

  return (
    <>
      <Card className="border-warning/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Radar de Risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {indicators.map(ind => (
              <button
                key={ind.key}
                onClick={() => ind.count > 0 && setDetailType(ind.key)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${ind.bgColor} ${ind.count > 0 ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
              >
                <div className={ind.color}>{ind.icon}</div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{ind.label}</p>
                  <p className={`text-sm font-semibold ${ind.color}`}>{ind.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailType !== null} onOpenChange={() => setDetailType(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {detailType === "employees" && "Funcionários com 3+ Tarefas Atrasadas"}
              {detailType === "stalled" && "Tarefas Paradas há 8h+"}
              {detailType === "sectors" && "Setores com Atraso Acima da Média"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {detailType === "employees" && criticalEmployees.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                <span className="text-sm font-medium">{e.name}</span>
                <Badge variant="destructive">{e.overdueCount} atrasadas</Badge>
              </div>
            ))}
            {detailType === "stalled" && stalledTasks.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.assignedName}</p>
                </div>
                <Badge variant="outline" className="text-warning border-warning/30">{t.stalledHours}h parada</Badge>
              </div>
            ))}
            {detailType === "sectors" && riskySectors.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                <span className="text-sm font-medium">{s.name}</span>
                <Badge variant="destructive">{Math.round(s.overdueRate)}% de atraso</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
