import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Trash2, Users, Building } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Department = Tables<"departments">;
type Invitation = Tables<"invitations">;
type UserRole = Tables<"user_roles">;

const roleLabels: Record<string, string> = { admin: "Admin", manager: "Gerente", employee: "Funcionário" };

export default function Team() {
  const { user, role, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<(Profile & { user_roles?: UserRole[] })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [deptModal, setDeptModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [inviteForm, setInviteForm] = useState({ email: "", role: "employee" as string, department_id: "" });

  const isAdmin = role === "admin";

  const fetchData = async () => {
    if (!currentProfile?.company_id) return;
    const [membersRes, deptsRes, invitesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("company_id", currentProfile.company_id),
      supabase.from("departments").select("*").eq("company_id", currentProfile.company_id),
      supabase.from("invitations").select("*").eq("company_id", currentProfile.company_id).is("accepted_at", null),
      supabase.from("user_roles").select("*"),
    ]);
    if (deptsRes.data) setDepartments(deptsRes.data);
    if (invitesRes.data) setInvitations(invitesRes.data);
    if (membersRes.data && rolesRes.data) {
      const merged = membersRes.data.map((m) => ({
        ...m,
        user_roles: rolesRes.data.filter((r) => r.user_id === m.id),
      }));
      setMembers(merged);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user, currentProfile?.company_id]);

  const createDepartment = async () => {
    if (!deptName.trim() || !currentProfile?.company_id) return;
    const { error } = await supabase.from("departments").insert({ name: deptName.trim(), company_id: currentProfile.company_id });
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Setor criado!" });
    setDeptName("");
    setDeptModal(false);
    fetchData();
  };

  const deleteDepartment = async (id: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Setor removido" });
    fetchData();
  };

  const sendInvite = async () => {
    if (!inviteForm.email.trim() || !currentProfile?.company_id || !user) return;
    const { error } = await supabase.from("invitations").insert({
      email: inviteForm.email.trim(),
      role: inviteForm.role as any,
      department_id: inviteForm.department_id || null,
      company_id: currentProfile.company_id,
      invited_by: user.id,
    });
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Convite enviado!", description: `Link de convite gerado para ${inviteForm.email}` });
    setInviteForm({ email: "", role: "employee", department_id: "" });
    setInviteModal(false);
    fetchData();
  };

  const getInviteLink = (token: string) => `${window.location.origin}/accept-invite?token=${token}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe & Setores</h1>
          <p className="text-muted-foreground">Gerencie membros e setores da empresa</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setDeptModal(true)}>
              <Building className="mr-2 h-4 w-4" /> Novo Setor
            </Button>
          )}
          <Button onClick={() => setInviteModal(true)}>
            <Send className="mr-2 h-4 w-4" /> Convidar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members"><Users className="mr-2 h-4 w-4" /> Membros</TabsTrigger>
          <TabsTrigger value="departments"><Building className="mr-2 h-4 w-4" /> Setores</TabsTrigger>
          <TabsTrigger value="invitations"><Send className="mr-2 h-4 w-4" /> Convites Pendentes</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Setor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const dept = departments.find((d) => d.id === m.department_id);
                    const userRole = m.user_roles?.[0]?.role;
                    const initials = m.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{m.full_name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground">{m.phone || ""}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{m.position || "—"}</TableCell>
                        <TableCell>
                          {userRole && <Badge variant="secondary">{roleLabels[userRole]}</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{dept?.name || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => {
              const deptMembers = members.filter((m) => m.department_id === dept.id);
              return (
                <Card key={dept.id}>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{dept.name}</CardTitle>
                      <CardDescription>{deptMembers.length} membro(s)</CardDescription>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => deleteDepartment(dept.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex -space-x-2">
                      {deptMembers.slice(0, 5).map((m) => (
                        <Avatar key={m.id} className="h-8 w-8 border-2 border-card">
                          <AvatarFallback className="text-xs">{m.full_name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                      ))}
                      {deptMembers.length > 5 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs">
                          +{deptMembers.length - 5}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {departments.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                Nenhum setor criado ainda
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Link</TableHead>
                    {isAdmin && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => {
                    const dept = departments.find((d) => d.id === inv.department_id);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.email}</TableCell>
                        <TableCell><Badge variant="secondary">{roleLabels[inv.role]}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{dept?.name || "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => {
                            navigator.clipboard.writeText(getInviteLink(inv.token));
                            toast({ title: "Link copiado!" });
                          }}>Copiar Link</Button>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={async () => {
                              await supabase.from("invitations").delete().eq("id", inv.id);
                              fetchData();
                            }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {invitations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum convite pendente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department Modal */}
      <Dialog open={deptModal} onOpenChange={setDeptModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Setor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Setor</Label>
              <Input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="Ex: Financeiro" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptModal(false)}>Cancelar</Button>
            <Button onClick={createDepartment}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Modal */}
      <Dialog open={inviteModal} onOpenChange={setInviteModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar Membro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="manager">Gerente</SelectItem>}
                  <SelectItem value="employee">Funcionário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={inviteForm.department_id} onValueChange={(v) => setInviteForm({ ...inviteForm, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModal(false)}>Cancelar</Button>
            <Button onClick={sendInvite}><Send className="mr-2 h-4 w-4" /> Enviar Convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
