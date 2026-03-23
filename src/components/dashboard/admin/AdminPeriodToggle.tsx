import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar, CalendarDays, CalendarRange, CalendarClock, CalendarSearch } from "lucide-react";

export type AdminPeriod = "today" | "yesterday" | "week" | "month" | "custom";

interface AdminPeriodToggleProps {
  value: AdminPeriod;
  onChange: (value: AdminPeriod) => void;
}

export default function AdminPeriodToggle({ value, onChange }: AdminPeriodToggleProps) {
  const itemClass = "gap-1.5 text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm";

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as AdminPeriod)}
      className="bg-muted rounded-lg p-1"
    >
      <ToggleGroupItem value="today" className={itemClass}>
        <Calendar className="h-3.5 w-3.5" />
        Hoje
      </ToggleGroupItem>
      <ToggleGroupItem value="yesterday" className={itemClass}>
        <CalendarDays className="h-3.5 w-3.5" />
        Ontem
      </ToggleGroupItem>
      <ToggleGroupItem value="week" className={itemClass}>
        <CalendarRange className="h-3.5 w-3.5" />
        Semana
      </ToggleGroupItem>
      <ToggleGroupItem value="month" className={itemClass}>
        <CalendarClock className="h-3.5 w-3.5" />
        Mês
      </ToggleGroupItem>
      <ToggleGroupItem value="custom" className={itemClass}>
        <CalendarSearch className="h-3.5 w-3.5" />
        Personalizado
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
