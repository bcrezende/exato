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
const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };
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

  const [form, setForm] = useState(() => getInitialForm(editing, isAdmin, currentProfile));

  // Sync form when editing prop changes
  useEffect(() => {
    if (open) {
      setForm(getInitialForm(editing, isAdmin, currentProfile));
    }
  }, [editing, open]);

  const resetForm = (task: Task | null) => {
    setForm(getInitialForm(task, isAdmin, currentProfile));
  };

  // Filter members for manager: only their department
  const filteredMembers = isManager && currentProfile?.department_id
    ? members.filter(m => m.department_id === currentProfile.department_id)
    : members;

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ variant: "destructive", title: "Título obrigatório" }); return; }
    if (!currentProfile?.company_id || !user) return;

    const departmentId = isAdmin
      ? (form.department_id || null)
      : (currentProfile.department_id || null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to: form.assigned_to || null,
      status: form.status as any,
      priority: form.priority as any,
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

  // Sync form state when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) resetForm(editing);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          <DialogDescription>{editing ? "Atualize os dados da tarefa" : "Preencha os dados para criar uma nova tarefa"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título da tarefa" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva a tarefa..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {filteredMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!isAdmin && (
              <div className="space-y-2">
                <Label>Recorrência</Label>
                <Select value={form.recurrence_type} onValueChange={(v) => setForm({ ...form, recurrence_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Select value={form.recurrence_type} onValueChange={(v) => setForm({ ...form, recurrence_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data/Hora de Início</Label>
              <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data/Hora de Término</Label>
              <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
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

function getInitialForm(task: Task | null, isAdmin: boolean, currentProfile: Tables<"profiles"> | null) {
  if (task) {
    return {
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to || "",
      status: task.status,
      priority: task.priority,
      start_date: task.start_date ? task.start_date.slice(0, 16) : "",
      due_date: task.due_date ? task.due_date.slice(0, 16) : "",
      recurrence_type: task.recurrence_type,
      department_id: task.department_id || "",
    };
  }
  return {
    title: "",
    description: "",
    assigned_to: "",
    status: "pending",
    priority: "medium",
    start_date: "",
    due_date: "",
    recurrence_type: "none",
    department_id: isAdmin ? "" : (currentProfile?.department_id || ""),
  };
}
