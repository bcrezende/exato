import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  today: Date;
  roleLabel: string;
  onOpenFilters: () => void;
  onNavigateMyDay: () => void;
  hasActiveFilters: boolean;
}

export default function DashboardHeader({
  today,
  roleLabel,
  onOpenFilters,
  onNavigateMyDay,
  hasActiveFilters,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })} — {roleLabel}
        </p>
      </div>
      <div className="flex items-center gap-2">
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
