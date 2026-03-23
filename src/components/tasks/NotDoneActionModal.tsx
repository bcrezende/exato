import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatStoredDate } from "@/lib/date-utils";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

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
  const [newTime, setNewTime] = useState<string>("");
  const [justMark, setJustMark] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pre-fill time from original task due_date
  const defaultTime = useMemo(() => {
    if (!task?.due_date) return "08:00";
    const d = new Date(task.due_date);
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(Math.round(d.getUTCMinutes() / 15) * 15).padStart(2, "0");
    return `${h}:${m === "60" ? "00" : m}`;
  }, [task?.due_date]);

  if (!task) return null;

  const isRecurring = !!(task.recurrence_parent_id || (task.recurrence_type && task.recurrence_type !== "none"));

  const selectedTime = newTime || defaultTime;

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

      let newDueDate: string | undefined;
      if (action === "reschedule" && newDate) {
        // Build fake-UTC ISO string preserving selected date + time
        const [hh, mm] = selectedTime.split(":");
        const y = newDate.getFullYear();
        const mo = String(newDate.getMonth() + 1).padStart(2, "0");
        const dd = String(newDate.getDate()).padStart(2, "0");
        newDueDate = `${y}-${mo}-${dd}T${hh}:${mm}:00+00:00`;
      }

      await onConfirm({
        taskId: task.id,
        reason: reason || undefined,
        action,
        newDueDate,
      });
      setReason("");
      setNewDate(undefined);
      setNewTime("");
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

              <div className="grid grid-cols-2 gap-2">
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
                      {newDate ? format(newDate, "dd/MM/yyyy") : "Data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDate}
                      onSelect={setNewDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Select
                  value={selectedTime}
                  onValueChange={setNewTime}
                  disabled={justMark}
                >
                  <SelectTrigger className={cn(!newTime && "text-muted-foreground")}>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Horário" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="just-mark"
                  checked={justMark}
                  onCheckedChange={(v) => {
                    setJustMark(!!v);
                    if (v) {
                      setNewDate(undefined);
                      setNewTime("");
                    }
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
