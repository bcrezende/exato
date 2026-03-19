import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar, CalendarDays, CalendarRange, CalendarClock } from "lucide-react";

export type AdminPeriod = "today" | "yesterday" | "week" | "month";

interface AdminPeriodToggleProps {
  value: AdminPeriod;
  onChange: (value: AdminPeriod) => void;
}

export default function AdminPeriodToggle({ value, onChange }: AdminPeriodToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as AdminPeriod)}
      className="bg-muted rounded-lg p-1"
    >
      <ToggleGroupItem value="today" className="gap-1.5 text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm">
        <Calendar className="h-3.5 w-3.5" />
        Hoje
      </ToggleGroupItem>
      <ToggleGroupItem value="yesterday" className="gap-1.5 text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm">
        <CalendarDays className="h-3.5 w-3.5" />
        Ontem
      </ToggleGroupItem>
      <ToggleGroupItem value="week" className="gap-1.5 text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm">
        <CalendarRange className="h-3.5 w-3.5" />
        Semana
      </ToggleGroupItem>
      <ToggleGroupItem value="month" className="gap-1.5 text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm">
        <CalendarClock className="h-3.5 w-3.5" />
        Mês
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
