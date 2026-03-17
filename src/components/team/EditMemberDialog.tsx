import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Department = Tables<"departments">;
type UserRole = Tables<"user_roles">;

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: (Profile & { user_roles?: UserRole[] }) | null;
  departments: Department[];
  onSaved: () => void;
}

const roleLabels: Record<string, string> = { admin: "Admin", manager: "Gerente", coordinator: "Coordenador", analyst: "Analista" };

export default function EditMemberDialog({ open, onOpenChange, member, departments, onSaved }: EditMemberDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({ full_name: "", position: "", phone: "", department_id: "", role: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        full_name: member.full_name || "",
        position: member.position || "",
        phone: member.phone || "",
        department_id: member.department_id || "",
        role: member.user_roles?.[0]?.role || "analyst",
      });
    }
  }, [member]);

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        position: form.position || null,
        phone: form.phone || null,
        department_id: form.department_id || null,
      })
      .eq("id", member.id);

    if (profileError) {
      toast({ variant: "destructive", title: "Erro", description: profileError.message });
      setSaving(false);
      return;
    }

    // Update role if changed
    const currentRole = member.user_roles?.[0]?.role;
    if (currentRole && currentRole !== form.role) {
      // Delete old role, insert new
      await supabase.from("user_roles").delete().eq("user_id", member.id);
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: member.id, role: form.role as any });
      if (roleError) {
        toast({ variant: "destructive", title: "Erro ao atualizar papel", description: roleError.message });
        setSaving(false);
        return;
      }
    }

    toast({ title: "Membro atualizado!" });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Membro</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Ex: Desenvolvedor" />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-2">
            <Label>Setor</Label>
            <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="employee">Funcionário</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
