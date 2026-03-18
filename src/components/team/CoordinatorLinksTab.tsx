import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Link2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type UserRole = Tables<"user_roles">;

interface CoordinatorLink {
  id: string;
  coordinator_id: string;
  analyst_id: string;
  company_id: string;
}

interface CoordinatorLinksTabProps {
  members: (Profile & { user_roles?: UserRole[] })[];
  links: CoordinatorLink[];
  companyId: string;
  onRefresh: () => void;
}

export default function CoordinatorLinksTab({ members, links, companyId, onRefresh }: CoordinatorLinksTabProps) {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ coordinator_id: "", analyst_id: "" });
  const [saving, setSaving] = useState(false);

  const coordinators = members.filter((m) => m.user_roles?.some((r) => r.role === "coordinator"));
  const analysts = members.filter((m) => m.user_roles?.some((r) => r.role === "analyst"));

  // Group links by coordinator
  const grouped = coordinators.map((coord) => ({
    coordinator: coord,
    analysts: links
      .filter((l) => l.coordinator_id === coord.id)
      .map((l) => ({
        linkId: l.id,
        profile: members.find((m) => m.id === l.analyst_id),
      }))
      .filter((a) => a.profile),
  }));

  // Analysts already linked to the selected coordinator
  const linkedAnalystIds = new Set(
    links.filter((l) => l.coordinator_id === form.coordinator_id).map((l) => l.analyst_id)
  );
  const availableAnalysts = analysts.filter((a) => !linkedAnalystIds.has(a.id));

  const createLink = async () => {
    if (!form.coordinator_id || !form.analyst_id) return;
    setSaving(true);
    const { error } = await supabase.from("coordinator_analysts").insert({
      coordinator_id: form.coordinator_id,
      analyst_id: form.analyst_id,
      company_id: companyId,
    });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      return;
    }
    toast({ title: "Vínculo criado!" });
    setForm({ coordinator_id: "", analyst_id: "" });
    setModalOpen(false);
    onRefresh();
  };

  const removeLink = async (linkId: string) => {
    const { error } = await supabase.from("coordinator_analysts").delete().eq("id", linkId);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      return;
    }
    toast({ title: "Vínculo removido" });
    onRefresh();
  };

  const getInitials = (name?: string | null) =>
    name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Vincular Analista
        </Button>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Nenhum coordenador encontrado. Atribua o papel de Coordenador a um membro primeiro.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grouped.map(({ coordinator, analysts: linkedAnalysts }) => (
          <Card key={coordinator.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{getInitials(coordinator.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{coordinator.full_name || "Sem nome"}</CardTitle>
                  <CardDescription>{linkedAnalysts.length} analista(s)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {linkedAnalysts.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum analista vinculado</p>
              )}
              {linkedAnalysts.map(({ linkId, profile }) => (
                <div key={linkId} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{getInitials(profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{profile?.full_name || "Sem nome"}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLink(linkId)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" /> Vincular Analista a Coordenador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Coordenador</Label>
              <Select value={form.coordinator_id} onValueChange={(v) => setForm({ ...form, coordinator_id: v, analyst_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecionar coordenador" /></SelectTrigger>
                <SelectContent>
                  {coordinators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name || "Sem nome"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Analista</Label>
              <Select value={form.analyst_id} onValueChange={(v) => setForm({ ...form, analyst_id: v })} disabled={!form.coordinator_id}>
                <SelectTrigger><SelectValue placeholder={form.coordinator_id ? "Selecionar analista" : "Escolha um coordenador primeiro"} /></SelectTrigger>
                <SelectContent>
                  {availableAnalysts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name || "Sem nome"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={createLink} disabled={saving || !form.coordinator_id || !form.analyst_id}>
              {saving ? "Salvando..." : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
