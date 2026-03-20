import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { CalendarPlus } from "lucide-react";
import type { RecurrenceDefinition } from "@/hooks/useRecurrenceDefinitions";

function getRecurrenceTimeLabel(
  recurrenceType: string,
  definitions?: RecurrenceDefinition[]
): string {
  const def = definitions?.find((d) => d.key === recurrenceType);
  if (def) {
    const { interval_unit, interval_value } = def;
    if (interval_unit === "day")
      return interval_value === 1 ? "amanhã" : `em ${interval_value} dias`;
    if (interval_unit === "week")
      return interval_value === 1
        ? "semana que vem"
        : `em ${interval_value} semanas`;
    if (interval_unit === "month")
      return interval_value === 1
        ? "mês que vem"
        : `em ${interval_value} meses`;
    if (interval_unit === "year")
      return interval_value === 1
        ? "ano que vem"
        : `em ${interval_value} anos`;
  }
  switch (recurrenceType) {
    case "daily":
      return "amanhã";
    case "weekly":
      return "semana que vem";
    case "monthly":
      return "mês que vem";
    case "yearly":
      return "ano que vem";
    default:
      return "no próximo período";
  }
}

interface RecurrenceConfirmDialogProps {
  open: boolean;
  recurrenceType: string;
  definitions?: RecurrenceDefinition[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RecurrenceConfirmDialog({
  open,
  recurrenceType,
  definitions,
  onConfirm,
  onCancel,
}: RecurrenceConfirmDialogProps) {
  const timeLabel = getRecurrenceTimeLabel(recurrenceType, definitions);

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Gerar próxima tarefa?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Deseja gerar a próxima tarefa para{" "}
            <span className="font-semibold text-foreground">{timeLabel}</span>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Não gerar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Gerar tarefa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
