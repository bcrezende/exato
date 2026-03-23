import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [justMark, setJustMark] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!task) return null;

  const isRecurring = !!(task.recurrence_parent_id || (task.recurrence_type && task.recurrence_type !== "none"));

  const handleConfirm = async () => {
    setLoading(true);
    try {
      let action: "generate_next" | "reschedule" | "just_mark";
      if (isRecurring) {
        action = "generate_next";
      } else if (justMark || !newDate) {
        action = "just_mark";
      } else {
        action = "reschedule";
      }

      await onConfirm({
        taskId: task.id,
        reason: reason || undefined,
        action,
        newDueDate: action === "reschedule" && newDate ? newDate.toISOString() : undefined,
      });
      setReason("");
      setNewDate(undefined);
      setJustMark(false);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const canConfirmNonRecurring = justMark || !!newDate;

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

          {isRecurring ? (
            /* ── Recurring flow ── */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esta tarefa será marcada como não feita e a próxima ocorrência será gerada automaticamente.
              </p>

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
          ) : (
            /* ── Non-recurring flow ── */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Quando deseja alterar o prazo final da tarefa?
              </p>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newDate && "text-muted-foreground"
                    )}
                    disabled={justMark}
                  >
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="just-mark"
                  checked={justMark}
                  onCheckedChange={(v) => {
                    setJustMark(!!v);
                    if (v) setNewDate(undefined);
                  }}
                />
                <Label htmlFor="just-mark" className="text-sm cursor-pointer">
                  Apenas marcar como não feita
                </Label>
              </div>

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
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (!isRecurring && !canConfirmNonRecurring)}
          >
            {loading ? "Processando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
