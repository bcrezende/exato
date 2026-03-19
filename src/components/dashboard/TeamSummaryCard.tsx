import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, BarChart3 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface Profile {
  id: string;
  full_name: string | null;
  department_id: string | null;
}

interface TeamSummaryCardProps {
  profiles: Profile[];
  todayTasks: Task[];
}

export default function TeamSummaryCard({ profiles, todayTasks }: TeamSummaryCardProps) {
  const stats = useMemo(() => {
    const totalMembers = profiles.length;
    const membersWithTasks = new Set(todayTasks.map(t => t.assigned_to).filter(Boolean));
    const withTasks = membersWithTasks.size;
    const withoutTasks = totalMembers - withTasks;
    const avgLoad = totalMembers > 0 ? (todayTasks.length / totalMembers).toFixed(1) : "0";

    return { totalMembers, withTasks, withoutTasks, avgLoad };
  }, [profiles, todayTasks]);

  const items = [
    { icon: <Users className="h-4 w-4 text-primary" />, label: "Total", value: stats.totalMembers },
    { icon: <UserCheck className="h-4 w-4 text-success" />, label: "Com tarefas", value: stats.withTasks },
    { icon: <UserX className="h-4 w-4 text-muted-foreground" />, label: "Sem tarefas", value: stats.withoutTasks },
    { icon: <BarChart3 className="h-4 w-4 text-primary" />, label: "Carga média", value: stats.avgLoad },
  ];

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2.5">
              {item.icon}
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold leading-tight">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
