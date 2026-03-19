import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRecurrenceDefinitions } from "@/hooks/useRecurrenceDefinitions";
import { localInputToISO, isoToLocalInput } from "@/lib/date-utils";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type Profile = Tables<"profiles">;
type Department = Tables<"departments">;

const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada" };

// Time options in 15-min intervals
const timeOptions = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

function getDatePart(dt: string): Date | undefined {
  if (!dt) return undefined;
  const [datePart] = dt.split("T");
  if (!datePart) return undefined;
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getTimePart(dt: string): string {
  if (!dt || !dt.includes("T")) return "";
  return dt.split("T")[1]?.slice(0, 5) || "";
}

function composeDt(date: Date | undefined, time: string): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T${time || "08:00"}`;
}

function addOneHour(time: string): string {
  if (!time) return "09:00";
  const [h, m] = time.split(":").map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Task | null;
  members: Profile[];
  departments: Department[];
  onSaved: () => void;
}

export default function TaskForm({ open, onOpenChange, editing, members, departments, onSaved }: TaskFormProps) {
  const { user, role, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const { definitions, getLabelsMap, getMaxSpanDays, getWeekdaysLabel, getDefinition } = useRecurrenceDefinitions();
  const recurrenceLabels = getLabelsMap();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isAnalyst = role === "analyst";
  const isCoordinator = role === "coordinator";

  const [form, setForm] = useState(() => getInitialForm(editing, isAdmin, currentProfile));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(getInitialForm(editing, isAdmin, currentProfile));
      setErrors({});
    }
  }, [editing, open]);

  useEffect(() => {
    if (form.start_date && form.due_date) {
      const diff = new Date(form.due_date).getTime() - new Date(form.start_date).getTime();
      if (diff > 0) {
        setForm(prev => ({ ...prev, estimated_minutes: String(Math.round(diff / 60000)) }));
      }
    }
  }, [form.start_date, form.due_date]);

  // Auto-adjust due_date when recurrence_type changes to daily
  useEffect(() => {
    if (form.recurrence_type === "daily" && form.start_date && form.due_date) {
      const startDate = form.start_date.split("T")[0];
      const dueDate = form.due_date.split("T")[0];
      if (startDate !== dueDate) {
        const dueTime = form.due_date.split("T")[1] || "23:59";
        setForm(prev => ({ ...prev, due_date: `${startDate}T${dueTime}` }));
      }
    }
  }, [form.recurrence_type, form.start_date]);

  // Auto-suggest 1h duration when start is set and due is empty
  useEffect(() => {
    if (form.start_date && !form.due_date) {
      const startDate = getDatePart(form.start_date);
      const startTime = getTimePart(form.start_date);
      if (startDate && startTime) {
        const endTime = addOneHour(startTime);
        setForm(prev => ({ ...prev, due_date: composeDt(startDate, endTime) }));
      }
    }
  }, [form.start_date]);

  const resetForm = (task: Task | null) => {
    setForm(getInitialForm(task, isAdmin, currentProfile));
    setErrors({});
  };

  const [coordinatorAnalystIds, setCoordinatorAnalystIds] = useState<string[]>([]);

  useEffect(() => {
    if (isCoordinator && user) {
      supabase.from("coordinator_analysts").select("analyst_id").eq("coordinator_id", user.id)
        .then(({ data }) => {
          if (data) setCoordinatorAnalystIds(data.map(d => d.analyst_id));
        });
    }
  }, [isCoordinator, user]);

  const filteredMembers = useMemo(() => {
    if (isCoordinator) return members.filter(m => coordinatorAnalystIds.includes(m.id) || m.id === user?.id);
    if (isManager && currentProfile?.department_id) return members.filter(m => m.department_id === currentProfile.department_id);
    return members;
  }, [members, isCoordinator, isManager, currentProfile, coordinatorAnalystIds]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = "Título é obrigatório";
    if (!isAnalyst && !form.assigned_to) newErrors.assigned_to = "Responsável é obrigatório";
    if (!form.start_date) newErrors.start_date = "Data de início é obrigatória";
    if (!form.due_date) newErrors.due_date = "Data de término é obrigatória";
    if (isAdmin && !form.department_id) newErrors.department_id = "Setor é obrigatório";
    if (!form.recurrence_type) newErrors.recurrence_type = "Recorrência é obrigatória";

    if (form.start_date && form.due_date) {
      const start = new Date(form.start_date);
      const due = new Date(form.due_date);

      if (start >= due) {
        newErrors.due_date = "Data de término deve ser após o início";
      } else {
        const diffDays = Math.round((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const startDay = form.start_date.split("T")[0];
        const dueDay = form.due_date.split("T")[0];
        const maxSpan = getMaxSpanDays(form.recurrence_type);

        if (form.recurrence_type === "daily" && startDay !== dueDay) {
          newErrors.due_date = "Tarefas diárias devem iniciar e terminar no mesmo dia";
        } else if (maxSpan && maxSpan > 0 && diffDays > maxSpan) {
          newErrors.due_date = `Tarefas com recorrência "${recurrenceLabels[form.recurrence_type] || form.recurrence_type}" devem ter no máximo ${maxSpan} dias de intervalo`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!currentProfile?.company_id || !user) return;

    const departmentId = isAdmin
      ? (form.department_id || null)
      : (currentProfile.department_id || null);

    const assignedTo = isAnalyst ? user.id : (form.assigned_to || null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to: assignedTo,
      status: editing ? form.status as any : "pending" as any,
      priority: "medium" as any,
      start_date: localInputToISO(form.start_date),
      due_date: localInputToISO(form.due_date),
      recurrence_type: form.recurrence_type as any,
      company_id: currentProfile.company_id,
      department_id: departmentId,
      estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes, 10) : null,
    };

    if (editing) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editing.id);
      if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
      toast({ title: "Tarefa atualizada!" });
    } else {
      const { error } = await supabase.from("tasks").insert({ ...payload, created_by: user.id });
      if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
      toast({ title: "Tarefa criada!" });
    }
    onOpenChange(false);
    onSaved();
  };

  const handleOpenChange = (v: boolean) => {
    if (v) resetForm(editing);
    onOpenChange(v);
  };

  const fieldClass = (field: string) =>
    errors[field] ? "border-destructive focus:ring-destructive" : "";

  // Handlers for DatePicker + Time Select
  const handleStartDateSelect = (date: Date | undefined) => {
    const currentTime = getTimePart(form.start_date) || "08:00";
    const newStart = composeDt(date, currentTime);
    setForm(prev => ({ ...prev, start_date: newStart }));
  };

  const handleStartTimeChange = (time: string) => {
    const currentDate = getDatePart(form.start_date);
    const newStart = composeDt(currentDate, time);
    setForm(prev => ({ ...prev, start_date: newStart }));
  };

  const handleDueDateSelect = (date: Date | undefined) => {
    const currentTime = getTimePart(form.due_date) || "09:00";
    const newDue = composeDt(date, currentTime);
    setForm(prev => ({ ...prev, due_date: newDue }));
  };

  const handleDueTimeChange = (time: string) => {
    const currentDate = getDatePart(form.due_date);
    const newDue = composeDt(currentDate, time);
    setForm(prev => ({ ...prev, due_date: newDue }));
  };

  const startDateValue = getDatePart(form.start_date);
  const startTimeValue = getTimePart(form.start_date);
  const dueDateValue = getDatePart(form.due_date);
  const dueTimeValue = getTimePart(form.due_date);

  const dateTimeError = errors.due_date && form.start_date && form.due_date;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          <DialogDescription>{editing ? "Atualize os dados da tarefa" : "Preencha os dados para criar uma nova tarefa"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Título */}
          <div className="space-y-2">
            <Label>Título <span className="text-destructive">*</span></Label>
            <Input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título da tarefa"
              className={fieldClass("title")}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva a tarefa..." rows={3} />
          </div>

          {!isAnalyst && (
            <div className="grid grid-cols-2 gap-4">
              {/* Responsável */}
              <div className="space-y-2">
                <Label>Responsável <span className="text-destructive">*</span></Label>
                <Select value={form.assigned_to || undefined} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger className={fieldClass("assigned_to")}><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {filteredMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.id}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.assigned_to && <p className="text-xs text-destructive">{errors.assigned_to}</p>}
              </div>

              {/* Setor (admin) or Recorrência (manager) */}
              {isAdmin ? (
                <div className="space-y-2">
                  <Label>Setor <span className="text-destructive">*</span></Label>
                  <Select value={form.department_id || undefined} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                    <SelectTrigger className={fieldClass("department_id")}><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.department_id && <p className="text-xs text-destructive">{errors.department_id}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Recorrência <span className="text-destructive">*</span></Label>
                  <Select value={form.recurrence_type} onValueChange={(v) => setForm({ ...form, recurrence_type: v })}>
                    <SelectTrigger className={fieldClass("recurrence_type")}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {definitions.map((d) => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.recurrence_type && <p className="text-xs text-destructive">{errors.recurrence_type}</p>}
                  {form.recurrence_type && getWeekdaysLabel(form.recurrence_type) && (
                    <p className="text-xs text-muted-foreground">Dias: {getWeekdaysLabel(form.recurrence_type)}</p>
                  )}
                  {form.recurrence_type && getDefinition(form.recurrence_type)?.skip_weekends && (
                    <p className="text-xs text-muted-foreground">Pula fins de semana</p>
                  )}
                  {form.recurrence_type && getDefinition(form.recurrence_type)?.skip_holidays && (
                    <p className="text-xs text-muted-foreground">Pula feriados</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Status (only when editing) */}
            {editing && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Recorrência for admin, coordinator or analyst */}
            {(isAdmin || isCoordinator || isAnalyst) && (
              <div className="space-y-2">
                <Label>Recorrência <span className="text-destructive">*</span></Label>
                <Select value={form.recurrence_type} onValueChange={(v) => setForm({ ...form, recurrence_type: v })}>
                  <SelectTrigger className={fieldClass("recurrence_type")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {definitions.map((d) => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.recurrence_type && <p className="text-xs text-destructive">{errors.recurrence_type}</p>}
                {form.recurrence_type && getWeekdaysLabel(form.recurrence_type) && (
                  <p className="text-xs text-muted-foreground">Dias: {getWeekdaysLabel(form.recurrence_type)}</p>
                )}
                {form.recurrence_type && getDefinition(form.recurrence_type)?.skip_weekends && (
                  <p className="text-xs text-muted-foreground">Pula fins de semana</p>
                )}
                {form.recurrence_type && getDefinition(form.recurrence_type)?.skip_holidays && (
                  <p className="text-xs text-muted-foreground">Pula feriados</p>
                )}
              </div>
            )}
          </div>

          {/* Tempo estimado (auto-calculado) */}
          <div className="space-y-2">
            <Label>Tempo estimado</Label>
            <Input
              type="text"
              value={form.estimated_minutes ? (() => {
                const mins = parseInt(form.estimated_minutes, 10);
                if (isNaN(mins) || mins <= 0) return "";
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return h > 0 ? `${h}h ${m > 0 ? `${m}min` : ""}`.trim() : `${m}min`;
              })() : ""}
              readOnly
              disabled
              placeholder="Calculado automaticamente"
              className="bg-muted"
            />
            {form.start_date && form.due_date && parseInt(form.estimated_minutes, 10) > 0 && (
              <p className="text-xs text-muted-foreground">Auto-calculado a partir das datas</p>
            )}
          </div>

          {/* Datas - Grid 2x2: DatePicker + Time Select */}
          <div className="space-y-3">
            {/* Linha 1: Data Início + Hora Início */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Data Início <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDateValue && "text-muted-foreground",
                        errors.start_date && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDateValue ? format(startDateValue, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione...</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDateValue}
                      onSelect={handleStartDateSelect}
                      locale={ptBR}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Hora Início <span className="text-destructive">*</span>
                </Label>
                <Select value={startTimeValue || undefined} onValueChange={handleStartTimeChange}>
                  <SelectTrigger className={cn(errors.start_date && !startTimeValue && "border-destructive")}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeOptions.map((t) => (
                      <SelectItem key={`start-${t}`} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {errors.start_date && <p className="text-xs text-destructive">{errors.start_date}</p>}

            {/* Linha 2: Data Término + Hora Término */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Data Término <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDateValue && "text-muted-foreground",
                        errors.due_date && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDateValue ? format(dueDateValue, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione...</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDateValue}
                      onSelect={handleDueDateSelect}
                      locale={ptBR}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Hora Término <span className="text-destructive">*</span>
                </Label>
                <Select value={dueTimeValue || undefined} onValueChange={handleDueTimeChange}>
                  <SelectTrigger className={cn(errors.due_date && !dueTimeValue && "border-destructive")}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeOptions.map((t) => (
                      <SelectItem key={`due-${t}`} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {errors.due_date && <p className="text-xs text-destructive">{errors.due_date}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{editing ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Now uses isoToLocalInput from date-utils (reads UTC components)
const toLocalDatetimeString = isoToLocalInput;

function getInitialForm(task: Task | null, isAdmin: boolean, currentProfile: Tables<"profiles"> | null) {
  if (task) {
    return {
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to || "",
      status: task.status,
      start_date: toLocalDatetimeString(task.start_date),
      due_date: toLocalDatetimeString(task.due_date),
      recurrence_type: task.recurrence_type,
      department_id: task.department_id || "",
      estimated_minutes: (task as any).estimated_minutes ? String((task as any).estimated_minutes) : "",
    };
  }
  return {
    title: "",
    description: "",
    assigned_to: "",
    status: "pending",
    start_date: "",
    due_date: "",
    recurrence_type: "none",
    department_id: isAdmin ? "" : (currentProfile?.department_id || ""),
    estimated_minutes: "",
  };
}
