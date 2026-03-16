import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type Profile = Tables<"profiles">;
type Department = Tables<"departments">;

const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada" };
const recurrenceLabels: Record<string, string> = { none: "Nenhuma", daily: "Diária", weekly: "Semanal", monthly: "Mensal", yearly: "Anual" };

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
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isEmployee = role === "employee";

  const [form, setForm] = useState(() => getInitialForm(editing, isAdmin, currentProfile));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(getInitialForm(editing, isAdmin, currentProfile));
      setErrors({});
    }
  }, [editing, open]);

  const resetForm = (task: Task | null) => {
    setForm(getInitialForm(task, isAdmin, currentProfile));
    setErrors({});
  };

  const filteredMembers = isManager && currentProfile?.department_id
    ? members.filter(m => m.department_id === currentProfile.department_id)
    : members;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = "Título é obrigatório";
    if (!form.assigned_to) newErrors.assigned_to = "Responsável é obrigatório";
    if (!form.start_date) newErrors.start_date = "Data de início é obrigatória";
    if (!form.due_date) newErrors.due_date = "Data de término é obrigatória";
    if (isAdmin && !form.department_id) newErrors.department_id = "Setor é obrigatório";
    if (!form.recurrence_type) newErrors.recurrence_type = "Recorrência é obrigatória";

    if (form.start_date && form.due_date && new Date(form.start_date) >= new Date(form.due_date)) {
      newErrors.due_date = "Data de término deve ser após o início";
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

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to: form.assigned_to || null,
      status: editing ? form.status as any : "pending" as any,
      priority: "medium" as any,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      recurrence_type: form.recurrence_type as any,
      company_id: currentProfile.company_id,
      department_id: departmentId,
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
                    {Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.recurrence_type && <p className="text-xs text-destructive">{errors.recurrence_type}</p>}
              </div>
            )}
          </div>

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

            {/* Recorrência for admin (separate row) */}
            {isAdmin && (
              <div className="space-y-2">
                <Label>Recorrência <span className="text-destructive">*</span></Label>
                <Select value={form.recurrence_type} onValueChange={(v) => setForm({ ...form, recurrence_type: v })}>
                  <SelectTrigger className={fieldClass("recurrence_type")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.recurrence_type && <p className="text-xs text-destructive">{errors.recurrence_type}</p>}
              </div>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data/Hora de Início <span className="text-destructive">*</span></Label>
              <Input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className={fieldClass("start_date")}
              />
              {errors.start_date && <p className="text-xs text-destructive">{errors.start_date}</p>}
            </div>
            <div className="space-y-2">
              <Label>Data/Hora de Término <span className="text-destructive">*</span></Label>
              <Input
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className={fieldClass("due_date")}
              />
              {errors.due_date && <p className="text-xs text-destructive">{errors.due_date}</p>}
            </div>
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

function toLocalDatetimeString(isoString: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

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
  };
}
