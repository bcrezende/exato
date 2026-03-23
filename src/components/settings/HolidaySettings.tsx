import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CalendarDays, Download } from "lucide-react";
import ImportBrazilHolidaysDialog from "./ImportBrazilHolidaysDialog";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Holiday {
  id: string;
  company_id: string;
  name: string;
  holiday_date: string;
  is_recurring: boolean;
  created_at: string;
}

export default function HolidaySettings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form, setForm] = useState({ name: "", holiday_date: "", is_recurring: true });
  const [saving, setSaving] = useState(false);

  const fetchHolidays = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from("company_holidays")
      .select("id, company_id, name, holiday_date, is_recurring, created_at")
      .eq("company_id", profile.company_id)
      .order("holiday_date", { ascending: true });
    if (data) setHolidays(data as Holiday[]);
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.company_id) fetchHolidays();
  }, [profile?.company_id]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", holiday_date: "", is_recurring: true });
    setDialogOpen(true);
  };

  const openEdit = (h: Holiday) => {
    setEditing(h);
    setForm({ name: h.name, holiday_date: h.holiday_date, is_recurring: h.is_recurring });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!profile?.company_id) return;
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Nome é obrigatório" }); return; }
    if (!form.holiday_date) { toast({ variant: "destructive", title: "Data é obrigatória" }); return; }

    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from("company_holidays")
        .update({ name: form.name.trim(), holiday_date: form.holiday_date, is_recurring: form.is_recurring })
        .eq("id", editing.id);
      if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); setSaving(false); return; }
      toast({ title: "Feriado atualizado!" });
    } else {
      const { error } = await supabase
        .from("company_holidays")
        .insert([{ company_id: profile.company_id, name: form.name.trim(), holiday_date: form.holiday_date, is_recurring: form.is_recurring }]);
      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "Já existe um feriado nessa data" });
        } else {
          toast({ variant: "destructive", title: "Erro", description: error.message });
        }
        setSaving(false);
        return;
      }
      toast({ title: "Feriado adicionado!" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchHolidays();
  };

  const handleDelete = async (h: Holiday) => {
    const { error } = await supabase.from("company_holidays").delete().eq("id", h.id);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Feriado removido!" });
    fetchHolidays();
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Feriados da Empresa
            </CardTitle>
            <CardDescription>Cadastre feriados para que tarefas recorrentes os pulem automaticamente</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Novo Feriado
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-medium">{h.name}</TableCell>
                <TableCell>{formatDate(h.holiday_date)}</TableCell>
                <TableCell>
                  {h.is_recurring ? (
                    <Badge variant="secondary">Anual</Badge>
                  ) : (
                    <Badge variant="outline">Único</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(h)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(h)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {holidays.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum feriado cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Feriado" : "Novo Feriado"}</DialogTitle>
            <DialogDescription>{editing ? "Atualize os dados do feriado" : "Cadastre um novo feriado"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Natal" />
            </div>
            <div className="space-y-2">
              <Label>Data <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.holiday_date} onChange={(e) => setForm({ ...form, holiday_date: e.target.value })} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={form.is_recurring}
                onCheckedChange={(checked) => setForm({ ...form, is_recurring: !!checked })}
              />
              <Label htmlFor="is_recurring" className="text-sm font-normal">Repete todo ano (feriado fixo)</Label>
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
