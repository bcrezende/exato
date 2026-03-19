import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNavigate } from "react-router-dom";

type ViewDate = "today" | "yesterday";

interface DashboardHeaderProps {
  today: Date;
  roleLabel: string;
  onNavigateMyDay: () => void;
  viewDate: ViewDate;
  onViewDateChange: (v: ViewDate) => void;
  onOpenAnalysis?: () => void;
}

export default function DashboardHeader({
  today,
  roleLabel,
  onNavigateMyDay,
  viewDate,
  onViewDateChange,
  onOpenAnalysis,
}: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })} — {roleLabel}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => navigate("/tasks?new=1")}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova Tarefa
        </Button>
        {onOpenAnalysis && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onOpenAnalysis}
          >
            <FileBarChart className="h-3.5 w-3.5" />
            Relatório
          </Button>
        )}

        <div className="flex items-center gap-1.5">
          <ToggleGroup
            type="single"
            value={viewDate}
            onValueChange={(v) => { if (v) onViewDateChange(v as ViewDate); }}
            className="bg-muted rounded-md p-0.5"
          >
            <ToggleGroupItem
              value="yesterday"
              className="text-xs h-7 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-sm"
            >
              Ontem
            </ToggleGroupItem>
            <ToggleGroupItem
              value="today"
              className="text-xs h-7 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-sm"
            >
              Hoje
            </ToggleGroupItem>
          </ToggleGroup>
          <Badge variant="outline" className="text-xs font-mono">
            {format(today, "dd/MM")}
          </Badge>
        </div>

        <Button variant="ghost" size="sm" onClick={onNavigateMyDay} className="gap-1.5 text-xs">
          <CalendarIcon className="h-3.5 w-3.5" />
          Meu Dia
        </Button>
      </div>
    </div>
  );
}
