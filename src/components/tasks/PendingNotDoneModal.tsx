import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, CalendarDays, CheckCircle, RefreshCw, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatStoredDate } from "@/lib/date-utils";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface PendingNotDoneModalProps {
  open: boolean;
  tasks: Task[];
  onResolve: (
    taskId: string,
    action: "reschedule" | "complete_late" | "generate_next",
    params?: { newDueDate?: string; parentId?: string }
  ) => Promise<void>;
}

export default function PendingNotDoneModal({ open, tasks, onResolve }: PendingNotDoneModalProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rescheduleDates, setRescheduleDates] = useState<Record<string, Date | undefined>>({});

  const handleAction = async (
    taskId: string,
    action: "reschedule" | "complete_late" | "generate_next",
    task: Task
  ) => {
    setLoadingId(taskId);
    try {
      const parentId = task.recurrence_parent_id || (task.recurrence_type !== "none" ? taskId : undefined);
      await onResolve(taskId, action, {
        newDueDate: action === "reschedule" ? rescheduleDates[taskId]?.toISOString() : undefined,
        parentId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const isRecurring = (task: Task) =>
    !!(task.recurrence_parent_id || (task.recurrence_type && task.recurrence_type !== "none"));

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Tarefas Pendentes
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Você tem {tasks.length} tarefa{tasks.length > 1 ? "s" : ""} não feita{tasks.length > 1 ? "s" : ""}. Resolva todas para continuar.
          </p>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <CalendarDays className="h-3 w-3" />
                      Vencida em: {formatStoredDate(task.due_date)}
                    </p>
                  )}
                </div>
                <Badge variant="destructive" className="text-[10px] shrink-0">Não feita</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Reschedule */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      disabled={loadingId === task.id}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {rescheduleDates[task.id]
                        ? format(rescheduleDates[task.id]!, "dd/MM")
                        : "Remarcar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={rescheduleDates[task.id]}
                      onSelect={(date) => setRescheduleDates(prev => ({ ...prev, [task.id]: date }))}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                    {rescheduleDates[task.id] && (
                      <div className="p-2 border-t">
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleAction(task.id, "reschedule", task)}
                          disabled={loadingId === task.id}
                        >
                          Confirmar {format(rescheduleDates[task.id]!, "dd/MM")}
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Complete late */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  disabled={loadingId === task.id}
                  onClick={() => handleAction(task.id, "complete_late", task)}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Concluir com atraso
                </Button>

                {/* Generate next (recurring only) */}
                {isRecurring(task) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    disabled={loadingId === task.id}
                    onClick={() => handleAction(task.id, "generate_next", task)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Gerar próxima
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
