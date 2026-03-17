import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRecurrenceDefinitions, type RecurrenceDefinition } from "@/hooks/useRecurrenceDefinitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

const unitLabels: Record<string, string> = { day: "Dia(s)", week: "Semana(s)", month: "Mês(es)", year: "Ano(s)" };

function generateKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function RecurrenceSettings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { definitions, fetchDefinitions } = useRecurrenceDefinitions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurrenceDefinition | null>(null);
  const [form, setForm] = useState({ name: "", interval_value: "1", interval_unit: "day", max_span_days: "1" });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", interval_value: "1", interval_unit: "day", max_span_days: "1" });
    setDialogOpen(true);
  };

  const openEdit = (def: RecurrenceDefinition) => {
    setEditing(def);
    setForm({
      name: def.name,
      interval_value: String(def.interval_value),
      interval_unit: def.interval_unit,
      max_span_days: String(def.max_span_days),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!profile?.company_id) return;
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Nome é obrigatório" }); return; }
    const intervalValue = parseInt(form.interval_value, 10);
    const maxSpanDays = parseInt(form.max_span_days, 10);
    if (isNaN(intervalValue) || intervalValue < 0) { toast({ variant: "destructive", title: "Valor do intervalo inválido" }); return; }
    if (isNaN(maxSpanDays) || maxSpanDays < 0) { toast({ variant: "destructive", title: "Limite máximo inválido" }); return; }

    setSaving(true);
    const key = editing ? editing.key : generateKey(form.name);

    if (editing) {
      const { error } = await supabase
        .from("recurrence_definitions")
        .update({
          name: form.name.trim(),
          interval_value: intervalValue,
          interval_unit: form.interval_unit as any,
          max_span_days: maxSpanDays,
        })
        .eq("id", editing.id);
      if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); setSaving(false); return; }
      toast({ title: "Recorrência atualizada!" });
    } else {
      const { error } = await supabase
        .from("recurrence_definitions")
        .insert([{
          company_id: profile.company_id,
          name: form.name.trim(),
          key,
          interval_value: intervalValue,
          interval_unit: form.interval_unit as any,
          max_span_days: maxSpanDays,
          is_system: false,
        }]);
      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "Já existe uma recorrência com essa chave" });
        } else {
          toast({ variant: "destructive", title: "Erro", description: error.message });
        }
        setSaving(false);
        return;
      }
      toast({ title: "Recorrência criada!" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchDefinitions();
  };

  const handleDelete = async (def: RecurrenceDefinition) => {
    // Check if in use
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("recurrence_type", def.key);

    if (count && count > 0) {
      toast({ variant: "destructive", title: "Não é possível excluir", description: `${count} tarefa(s) usam essa recorrência.` });
      return;
    }

    const { error } = await supabase.from("recurrence_definitions").delete().eq("id", def.id);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Recorrência removida!" });
    fetchDefinitions();
  };

  // Filter out 'none' from display
  const displayDefs = definitions.filter(d => d.key !== "none");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tipos de Recorrência</CardTitle>
            <CardDescription>Gerencie os tipos de recorrência disponíveis para tarefas</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nova Recorrência
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Intervalo</TableHead>
              <TableHead>Limite (dias)</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDefs.map((def) => (
              <TableRow key={def.id}>
                <TableCell className="font-medium">{def.name}</TableCell>
                <TableCell>{def.interval_value} {unitLabels[def.interval_unit] || def.interval_unit}</TableCell>
                <TableCell>{def.max_span_days}</TableCell>
                <TableCell>
                  {def.is_system ? (
                    <Badge variant="secondary">Sistema</Badge>
                  ) : (
                    <Badge variant="outline">Personalizada</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(def)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!def.is_system && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(def)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {displayDefs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma recorrência cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Recorrência" : "Nova Recorrência"}</DialogTitle>
            <DialogDescription>{editing ? "Atualize os dados da recorrência" : "Defina um novo tipo de recorrência para tarefas"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Quinzenal" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor do Intervalo</Label>
                <Input type="number" min={0} value={form.interval_value} onChange={(e) => setForm({ ...form, interval_value: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={form.interval_unit} onValueChange={(v) => setForm({ ...form, interval_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(unitLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Limite máximo de dias (para validação)</Label>
              <Input type="number" min={0} value={form.max_span_days} onChange={(e) => setForm({ ...form, max_span_days: e.target.value })} />
              <p className="text-xs text-muted-foreground">Intervalo máximo permitido entre data de início e término da tarefa (0 = sem limite)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
