import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Task = Tables<"tasks"> & { profiles?: { full_name: string | null } | null };
type Profile = Tables<"profiles">;

const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada" };
const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };
const recurrenceLabels: Record<string, string> = { none: "Nenhuma", daily: "Diária", weekly: "Semanal", monthly: "Mensal", yearly: "Anual" };

const priorityColors: Record<string, string> = { low: "bg-muted text-muted-foreground", medium: "bg-warning/10 text-warning", high: "bg-destructive/10 text-destructive" };
const statusColors: Record<string, string> = { pending: "bg-muted text-muted-foreground", in_progress: "bg-primary/10 text-primary", completed: "bg-success/10 text-success", overdue: "bg-destructive/10 text-destructive" };

export default function Tasks() {
  const { user, role, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", status: "pending" as string, priority: "medium" as string, due_date: "", recurrence_type: "none" as string });

  const canManage = role === "admin" || role === "manager";

  const fetchTasks = async () => {
    const { data } = await supabase.from("tasks").select("*, profiles:assigned_to(full_name)").order("created_at", { ascending: false });
    if (data) setTasks(data as Task[]);
  };

  const fetchMembers = async () => {
    if (!currentProfile?.company_id) return;
    const { data } = await supabase.from("profiles").select("*").eq("company_id", currentProfile.company_id);
    if (data) setMembers(data);
  };

  useEffect(() => { if (user) { fetchTasks(); fetchMembers(); } }, [user]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", assigned_to: "", status: "pending", priority: "medium", due_date: "", recurrence_type: "none" });
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to || "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.slice(0, 16) : "",
      recurrence_type: task.recurrence_type,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ variant: "destructive", title: "Título obrigatório" }); return; }
    if (!currentProfile?.company_id || !user) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to: form.assigned_to || null,
      status: form.status as any,
      priority: form.priority as any,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      recurrence_type: form.recurrence_type as any,
      company_id: currentProfile.company_id,
      department_id: currentProfile.department_id,
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
    setModalOpen(false);
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Tarefa removida" });
    fetchTasks();
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await supabase.from("tasks").update({ status: newStatus as any }).eq("id", taskId);
    fetchTasks();
  };

  const filtered = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie as tarefas da sua equipe</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar tarefas..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.map((task) => (
          <Card key={task.id} className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{task.title}</h3>
                  <Badge className={statusColors[task.status]} variant="secondary">{statusLabels[task.status]}</Badge>
                  <Badge className={priorityColors[task.priority]} variant="secondary">{priorityLabels[task.priority]}</Badge>
                </div>
                {task.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{task.description}</p>}
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  {task.profiles?.full_name && <span>→ {task.profiles.full_name}</span>}
                  {task.due_date && <span>Prazo: {format(new Date(task.due_date), "dd/MM/yyyy HH:mm")}</span>}
                  {task.recurrence_type !== "none" && <Badge variant="outline" className="text-xs">{recurrenceLabels[task.recurrence_type]}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(role === "employee" && task.assigned_to === user?.id) && (
                  <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                    <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {canManage && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(task)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Nenhuma tarefa encontrada
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
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
                    {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.id}</SelectItem>)}
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
              <div className="space-y-2">
                <Label>Recorrência</Label>
                <Select value={form.recurrence_type} onValueChange={(v) => setForm({ ...form, recurrence_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
