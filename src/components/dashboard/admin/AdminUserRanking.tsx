import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import type { AdminPeriod } from "./AdminPeriodToggle";

type Task = Tables<"tasks">;
type TimeLog = { id: string; task_id: string; user_id: string; action: string; created_at: string };
type Profile = { id: string; full_name: string | null; department_id: string | null };

interface AdminUserRankingProps {
  tasks: Task[];
  timeLogs: TimeLog[];
  profiles: Profile[];
  departments: { id: string; name: string }[];
  period: AdminPeriod;
  selectedDepartment: string | null;
}

type SortKey = "position" | "completed" | "onTime" | "late" | "points";

export default function AdminUserRanking({ tasks, timeLogs, profiles, departments, period, selectedDepartment }: AdminUserRankingProps) {
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortAsc, setSortAsc] = useState(false);

  const deptMap = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach(d => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const profileDeptMap = useMemo(() => {
    const m = new Map<string, string | null>();
    profiles.forEach(p => m.set(p.id, p.department_id));
    return m;
  }, [profiles]);

  const ranking = useMemo(() => {
    const now = new Date();
    const cutoff = period === "today" ? subDays(now, 1)
      : period === "yesterday" ? subDays(now, 2)
      : period === "week" ? subDays(now, 7)
      : subDays(now, 30);

    const lateStartSet = new Set<string>();
    timeLogs.forEach(log => {
      if (log.action === "started_late") lateStartSet.add(log.task_id);
    });

    let completedTasks = tasks.filter(t => t.status === "completed" && new Date(t.updated_at) >= cutoff);
    if (selectedDepartment) {
      completedTasks = completedTasks.filter(t => t.department_id === selectedDepartment);
    }

    const scores = new Map<string, { completed: number; onTime: number; late: number; highPriority: number; points: number }>();

    completedTasks.forEach(task => {
      const uid = task.assigned_to;
      if (!uid) return;
      if (!scores.has(uid)) scores.set(uid, { completed: 0, onTime: 0, late: 0, highPriority: 0, points: 0 });
      const s = scores.get(uid)!;
      s.completed += 1;
      s.points += 10;
      if (lateStartSet.has(task.id)) { s.late += 1; s.points -= 3; }
      else { s.onTime += 1; s.points += 5; }
      if (task.priority === "high") { s.highPriority += 1; s.points += 3; }
    });

    const ranked = [...scores.entries()].map(([uid, s]) => {
      const deptId = profileDeptMap.get(uid);
      return {
        userId: uid,
        name: profiles.find(p => p.id === uid)?.full_name || "Sem nome",
        department: deptId ? deptMap.get(deptId) || "—" : "—",
        ...s,
      };
    });

    ranked.sort((a, b) => b.points - a.points);
    return ranked;
  }, [tasks, timeLogs, period, selectedDepartment, deptMap, profileDeptMap, profiles]);

  const sorted = useMemo(() => {
    if (sortKey === "position") return ranking;
    const copy = [...ranking];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      return sortAsc ? va - vb : vb - va;
    });
    return copy;
  }, [ranking, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const medalIcon = (pos: number) => {
    if (pos === 0) return "🥇";
    if (pos === 1) return "🥈";
    if (pos === 2) return "🥉";
    return `${pos + 1}º`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Ranking de Usuários
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado no período</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs gap-1" onClick={() => handleSort("completed")}>
                      Concluídas <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs gap-1" onClick={() => handleSort("onTime")}>
                      No Prazo <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs gap-1" onClick={() => handleSort("late")}>
                      Atrasadas <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs gap-1" onClick={() => handleSort("points")}>
                      Pontos <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((user, idx) => {
                  const originalPos = ranking.findIndex(r => r.userId === user.userId);
                  return (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{medalIcon(originalPos)}</TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{user.department}</TableCell>
                      <TableCell>{user.completed}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{user.onTime}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.late > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">{user.late}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold">{user.points}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
