import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CalendarIcon, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatStoredDate } from "@/lib/date-utils";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface NotDoneActionModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (params: {
    taskId: string;
    reason?: string;
    action: "generate_next" | "reschedule" | "just_mark";
    newDueDate?: string;
  }) => Promise<void>;
}

export default function NotDoneActionModal({ task, open, onOpenChange, onConfirm }: NotDoneActionModalProps) {
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"generate_next" | "reschedule" | "just_mark">("just_mark");
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);

  if (!task) return null;

  const isRecurring = !!(task.recurrence_parent_id || (task.recurrence_type && task.recurrence_type !== "none"));

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm({
        taskId: task.id,
        reason: reason || undefined,
        action,
        newDueDate: action === "reschedule" && newDate ? newDate.toISOString() : undefined,
      });
      setReason("");
      setAction("just_mark");
      setNewDate(undefined);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Tarefa Não Feita
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="font-medium">{task.title}</p>
            {task.due_date && (
              <p className="text-sm text-muted-foreground">
                📅 Vencimento: {formatStoredDate(task.due_date)}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">O que deseja fazer?</p>

          {isRecurring ? (
            <RadioGroup value={action} onValueChange={(v) => setAction(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="generate_next" id="gen" />
                <Label htmlFor="gen">Gerar próxima ocorrência</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="just_mark" id="mark" />
                <Label htmlFor="mark">Apenas marcar como não feita</Label>
              </div>
            </RadioGroup>
          ) : (
            <div className="space-y-2">
              <RadioGroup value={action} onValueChange={(v) => setAction(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reschedule" id="resched" />
                  <Label htmlFor="resched">Remarcar para nova data</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="just_mark" id="mark2" />
                  <Label htmlFor="mark2">Apenas marcar como não feita</Label>
                </div>
              </RadioGroup>
              {action === "reschedule" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDate ? format(newDate, "dd/MM/yyyy") : "Selecionar nova data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDate}
                      onSelect={setNewDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>💬 Motivo (opcional)</Label>
            <Textarea
              placeholder="Descreva o motivo..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (action === "reschedule" && !newDate)}
          >
            {loading ? "Processando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
