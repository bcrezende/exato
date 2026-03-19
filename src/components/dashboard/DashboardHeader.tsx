import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, SlidersHorizontal, Plus, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type ViewDate = "today" | "yesterday";

interface DashboardHeaderProps {
  today: Date;
  roleLabel: string;
  onOpenFilters: () => void;
  onNavigateMyDay: () => void;
  hasActiveFilters: boolean;
  viewDate: ViewDate;
  onViewDateChange: (v: ViewDate) => void;
  onOpenAnalysis?: () => void;
}

export default function DashboardHeader({
  today,
  roleLabel,
  onOpenFilters,
  onNavigateMyDay,
  hasActiveFilters,
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
        <Button
          variant={viewDate === "yesterday" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewDateChange(viewDate === "yesterday" ? "today" : "yesterday")}
          className="gap-1.5 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Ontem
        </Button>
        <Button
          variant={viewDate === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewDateChange("today")}
          className="gap-1.5 text-xs"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          Hoje
        </Button>
        <Button variant="ghost" size="sm" onClick={onNavigateMyDay} className="gap-1.5 text-xs">
          <CalendarIcon className="h-3.5 w-3.5" />
          Meu Dia
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenFilters}
          className="gap-1.5 relative"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </div>
    </div>
  );
}
