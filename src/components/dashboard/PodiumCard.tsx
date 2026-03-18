import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { subDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type TimeLog = { id: string; task_id: string; user_id: string; action: string; created_at: string };
type Profile = { id: string; full_name: string | null; department_id: string | null };

interface PodiumCardProps {
  tasks: Task[];
  timeLogs: TimeLog[];
  profiles: Profile[];
  departments: { id: string; name: string }[];
  selectedDepartment: string | null;
}

type RankedUser = {
  userId: string;
  name: string;
  department: string;
  totalPoints: number;
  completed: number;
  onTime: number;
  late: number;
  highPriority: number;
};

type Period = "7d" | "30d" | "all";

export default function PodiumCard({ tasks, timeLogs, profiles, departments, selectedDepartment }: PodiumCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [period, setPeriod] = useState<Period>("7d");

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => m.set(p.id, p.full_name || "Sem nome"));
    return m;
  }, [profiles]);

  const deptMap = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const profileDeptMap = useMemo(() => {
    const m = new Map<string, string | null>();
    profiles.forEach((p) => m.set(p.id, p.department_id));
    return m;
  }, [profiles]);

  const ranking = useMemo(() => {
    const now = new Date();
    const cutoff = period === "7d" ? subDays(now, 7) : period === "30d" ? subDays(now, 30) : null;

    // Build set of tasks with started_late info
    const lateStartSet = new Set<string>();
    timeLogs.forEach((log) => {
      if (log.action === "started_late") lateStartSet.add(log.task_id);
    });

    // Filter completed tasks by period
    let completedTasks = tasks.filter((t) => t.status === "completed");
    if (cutoff) {
      completedTasks = completedTasks.filter((t) => new Date(t.updated_at) >= cutoff);
    }

    // Filter by department
    if (selectedDepartment) {
      completedTasks = completedTasks.filter((t) => t.department_id === selectedDepartment);
    }

    const scores = new Map<string, { completed: number; onTime: number; late: number; highPriority: number; points: number }>();

    completedTasks.forEach((task) => {
      const uid = task.assigned_to;
      if (!uid) return;

      if (!scores.has(uid)) {
        scores.set(uid, { completed: 0, onTime: 0, late: 0, highPriority: 0, points: 0 });
      }
      const s = scores.get(uid)!;

      // +10 per completed task
      s.completed += 1;
      s.points += 10;

      const wasLate = lateStartSet.has(task.id);
      if (wasLate) {
        s.late += 1;
        s.points -= 3;
      } else {
        s.onTime += 1;
        s.points += 5;
      }

      if (task.priority === "high") {
        s.highPriority += 1;
        s.points += 3;
      }
    });

    const ranked: RankedUser[] = [];
    scores.forEach((s, uid) => {
      const deptId = profileDeptMap.get(uid);
      ranked.push({
        userId: uid,
        name: profileMap.get(uid) || "Sem nome",
        department: deptId ? deptMap.get(deptId) || "—" : "—",
        totalPoints: s.points,
        completed: s.completed,
        onTime: s.onTime,
        late: s.late,
        highPriority: s.highPriority,
      });
    });

    ranked.sort((a, b) => b.totalPoints - a.totalPoints);
    return ranked;
  }, [tasks, timeLogs, period, selectedDepartment, profileMap, deptMap, profileDeptMap]);

  const top3 = ranking.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  const medalColors = ["text-amber-400", "text-gray-300", "text-amber-600"];
  const medalIcons = [
    <Trophy key="gold" className="h-6 w-6 text-amber-400" />,
    <Medal key="silver" className="h-6 w-6 text-gray-400" />,
    <Award key="bronze" className="h-6 w-6 text-amber-600" />,
  ];

  const podiumHeights = ["h-20", "h-28", "h-14"];
  const podiumBg = ["bg-gray-300/20", "bg-amber-400/20", "bg-amber-600/10"];

  const periodLabel = period === "7d" ? "7 dias" : period === "30d" ? "30 dias" : "Todo período";

  return (
    <>
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => setShowDialog(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-lg">Ranking de Produtividade</CardTitle>
            </div>
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as Period)}
            >
              <SelectTrigger
                className="w-[130px] h-8 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todo período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Nenhuma tarefa concluída no período
            </div>
          ) : (
            <>
              {/* Podium visual */}
              <div className="flex items-end justify-center gap-3 mb-4">
                {podiumOrder.map((user, idx) => {
                  const realPos = top3.length >= 3 ? [1, 0, 2][idx] : idx;
                  return (
                    <div key={user.userId} className="flex flex-col items-center gap-1 min-w-[80px]">
                      <div className="flex flex-col items-center">
                        {medalIcons[realPos]}
                        <span className="text-xs font-medium truncate max-w-[80px] text-center mt-1">
                          {user.name.split(" ")[0]}
                        </span>
                        <span className="text-lg font-bold">{user.totalPoints}</span>
                        <span className="text-[10px] text-muted-foreground">pts</span>
                      </div>
                      <div className={`w-full rounded-t-md ${podiumBg[realPos]} ${podiumHeights[realPos]} flex items-end justify-center pb-1`}>
                        <span className="text-xs font-bold text-muted-foreground">{realPos + 1}º</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Positions 4+ */}
              {ranking.length > 3 && (
                <div className="space-y-1 border-t pt-3">
                  {ranking.slice(3, 6).map((user, idx) => (
                    <div key={user.userId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-5 text-right">{idx + 4}º</span>
                        <span className="truncate max-w-[120px]">{user.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{user.totalPoints} pts</Badge>
                    </div>
                  ))}
                  {ranking.length > 6 && (
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      +{ranking.length - 6} analistas • Clique para ver todos
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Ranking Completo — {periodLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground mb-3 space-y-1">
            <p>
              <strong>Pontuação:</strong> Concluída (+10) • No prazo (+5) • Prioridade alta (+3) • Com atraso (−3)
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Analista</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead className="text-center">Concl.</TableHead>
                <TableHead className="text-center">No Prazo</TableHead>
                <TableHead className="text-center">Atraso</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((user, idx) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">
                    {idx < 3 ? (
                      <span className={idx === 0 ? "text-amber-400" : idx === 1 ? "text-gray-400" : "text-amber-600"}>
                        {idx + 1}º
                      </span>
                    ) : (
                      `${idx + 1}º`
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.department}</TableCell>
                  <TableCell className="text-center">{user.completed}</TableCell>
                  <TableCell className="text-center">{user.onTime}</TableCell>
                  <TableCell className="text-center">{user.late}</TableCell>
                  <TableCell className="text-right font-bold">{user.totalPoints}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
