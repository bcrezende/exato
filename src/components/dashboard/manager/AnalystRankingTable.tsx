import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Medal } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface AnalystRankingTableProps {
  tasks: Task[];
  profiles: { id: string; full_name: string | null; department_id: string | null }[];
  coordinatorLinks: { coordinator_id: string; analyst_id: string }[];
  departmentId: string | null;
  limit?: number;
}

type SortKey = "name" | "tasks" | "completed" | "overdue";

export default function AnalystRankingTable({ tasks, profiles, coordinatorLinks, departmentId, limit }: AnalystRankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("overdue");
  const [sortAsc, setSortAsc] = useState(false);

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach(p => m.set(p.id, p.full_name || "Sem nome"));
    return m;
  }, [profiles]);

  const coordMap = useMemo(() => {
    const m = new Map<string, string>();
    coordinatorLinks.forEach(l => {
      m.set(l.analyst_id, profileMap.get(l.coordinator_id) || "—");
    });
    return m;
  }, [coordinatorLinks, profileMap]);

  const ranking = useMemo(() => {
    const analysts = profiles.filter(p => departmentId ? p.department_id === departmentId : true);

    return analysts.map(analyst => {
      const userTasks = tasks.filter(t => t.assigned_to === analyst.id);
      const completed = userTasks.filter(t => t.status === "completed").length;
      const overdue = userTasks.filter(t =>
        t.status === "overdue" || (t.status !== "completed" && t.status !== "in_progress" && t.due_date && new Date(t.due_date) < new Date())
      ).length;

      return {
        id: analyst.id,
        name: analyst.full_name || "Sem nome",
        coordinator: coordMap.get(analyst.id) || "—",
        totalTasks: userTasks.length,
        completed,
        overdue,
      };
    }).filter(a => a.totalTasks > 0);
  }, [profiles, tasks, departmentId, coordMap]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "name"); }
  };

  const sorted = useMemo(() => {
    const arr = [...ranking];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "tasks": cmp = a.totalTasks - b.totalTasks; break;
        case "completed": cmp = a.completed - b.completed; break;
        case "overdue": cmp = a.overdue - b.overdue; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return limit ? arr.slice(0, limit) : arr;
  }, [ranking, sortKey, sortAsc, limit]);

  const getStatusIndicator = (overdue: number) => {
    if (overdue === 0) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" title="Sem atrasos" />;
    if (overdue === 1) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" title="1 atraso" />;
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" />
        <span className="text-xs text-destructive font-medium">{overdue}⚠️</span>
      </span>
    );
  };

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Desempenho dos Analistas
          {limit && <Badge variant="secondary" className="text-[10px]">Top {limit}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum analista com tarefas no período</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                  Analista <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead>Coordenador</TableHead>
                <TableHead className="cursor-pointer select-none text-center" onClick={() => handleSort("tasks")}>
                  Tarefas <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead className="cursor-pointer select-none text-center" onClick={() => handleSort("completed")}>
                  Concluídas <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((analyst, idx) => (
                <TableRow key={analyst.id}>
                  <TableCell className="font-medium">
                    {idx < 3 ? (
                      <Medal className={`h-4 w-4 ${medalColors[idx]}`} />
                    ) : (
                      <span className="text-muted-foreground">{idx + 1}º</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{analyst.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{analyst.coordinator}</TableCell>
                  <TableCell className="text-center">{analyst.totalTasks}</TableCell>
                  <TableCell className="text-center">{analyst.completed}</TableCell>
                  <TableCell className="text-center">{getStatusIndicator(analyst.overdue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
