import { useEffect, useState } from "react";
import { devError } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2, Building, Pencil, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Tables } from "@/integrations/supabase/types";
import EditMemberDialog from "@/components/team/EditMemberDialog";
import EditDepartmentDialog from "@/components/team/EditDepartmentDialog";
import CoordinatorLinksTab from "@/components/team/CoordinatorLinksTab";
import { TeamSkeleton } from "@/components/skeletons/TeamSkeleton";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";

type Profile = Tables<"profiles">;
type Department = Tables<"departments">;
type Invitation = Tables<"invitations">;
type UserRole = Tables<"user_roles">;

const roleLabels: Record<string, string> = { admin: "Admin", manager: "Gerente", coordinator: "Coordenador", analyst: "Analista" };

export default function Team() {
  const { user, role, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<(Profile & { user_roles?: UserRole[] })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [coordLinks, setCoordLinks] = useState<{ id: string; coordinator_id: string; analyst_id: string; company_id: string }[]>([]);
  const [deptModal, setDeptModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [inviteForm, setInviteForm] = useState({ email: "", role: "analyst" as string, department_id: "" });
  const [editMember, setEditMember] = useState<(Profile & { user_roles?: UserRole[] }) | null>(null);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [searchMembers, setSearchMembers] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [confirmDeleteInvite, setConfirmDeleteInvite] = useState<string | null>(null);
  const isAdmin = role === "admin";

  const fetchData = async () => {
    if (!currentProfile?.company_id) return;

    let membersQuery = supabase.from("profiles").select("*").eq("company_id", currentProfile.company_id);
    if (role === "manager" && currentProfile.department_id) {
      membersQuery = membersQuery.eq("department_id", currentProfile.department_id);
    }

    const [membersRes, deptsRes, invitesRes, rolesRes, linksRes] = await Promise.all([
      membersQuery,
      supabase.from("departments").select("id, name, company_id, created_at").eq("company_id", currentProfile.company_id),
      supabase.from("invitations").select("id, email, role, department_id, token, created_at, accepted_at, company_id, invited_by").eq("company_id", currentProfile.company_id).is("accepted_at", null),
      supabase.from("user_roles").select("id, user_id, role"),
      supabase.from("coordinator_analysts").select("id, coordinator_id, analyst_id, company_id").eq("company_id", currentProfile.company_id),
    ]);

    let coordAnalystIds: Set<string> | null = null;
    if (role === "coordinator" && user) {
      const { data } = await supabase.from("coordinator_analysts").select("analyst_id").eq("coordinator_id", user.id);
      if (data) {
        coordAnalystIds = new Set(data.map(a => a.analyst_id));
        coordAnalystIds.add(user.id);
      }
    }

    if (deptsRes.data) setDepartments(deptsRes.data);
    if (invitesRes.data) setInvitations(invitesRes.data);
    if (linksRes.data) setCoordLinks(linksRes.data);
    if (membersRes.data && rolesRes.data) {
      let membersList = membersRes.data;
      if (coordAnalystIds) {
        membersList = membersList.filter(m => coordAnalystIds!.has(m.id));
      }
      const merged = membersList.map((m) => ({
        ...m,
        user_roles: rolesRes.data.filter((r) => r.user_id === m.id),
      }));
      setMembers(merged);
    }
    setLoading(false);
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
    const departmentId = (role === "manager" || role === "coordinator") ? currentProfile.department_id : (inviteForm.department_id || null);
    if (inviteForm.role !== "admin" && role !== "manager" && role !== "coordinator" && !departmentId) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um setor para este convite." });
      return;
    }
    const { data: inserted, error } = await supabase.from("invitations").insert({
      email: inviteForm.email.trim(),
      role: inviteForm.role as any,
      department_id: departmentId,
      company_id: currentProfile.company_id,
      invited_by: user.id,
    }).select("id").single();
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }

    const { error: emailError } = await supabase.functions.invoke("send-invite-email", {
      body: { invitation_id: inserted.id },
    });
    if (emailError) {
      devError("Failed to send invite email:", emailError);
    }
    toast({ title: "Convite enviado!", description: `Email de convite enviado para ${inviteForm.email}` });
    setInviteForm({ email: "", role: "analyst", department_id: "" });
    setInviteModal(false);
    fetchData();
  };

  const getInviteLink = (token: string) => `${window.location.origin}/accept-invite?token=${token}`;

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const matchesSearch = !searchMembers || m.full_name?.toLowerCase().includes(searchMembers.toLowerCase());
    const matchesDept = filterDept === "all" || m.department_id === filterDept;
    const memberRole = m.user_roles?.[0]?.role;
    const matchesRole = filterRole === "all" || memberRole === filterRole;
    return matchesSearch && matchesDept && matchesRole;
  });

  if (loading) return <TeamSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setDeptModal(true)}>
              <Building className="mr-2 h-4 w-4" /> Novo Setor
            </Button>
          )}
          {role !== "analyst" && (
            <Button onClick={() => setInviteModal(true)}>
              <Send className="mr-2 h-4 w-4" /> Convidar
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="departments">Setores</TabsTrigger>
          <TabsTrigger value="invitations">Convites</TabsTrigger>
          {(isAdmin || role === "manager") && (
            <TabsTrigger value="links">Vínculos</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={searchMembers}
                    onChange={(e) => setSearchMembers(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os papéis</SelectItem>
                    {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Setor</TableHead>
                    {isAdmin && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((m) => {
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
                            <p className="font-medium">{m.full_name || "Sem nome"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {userRole && <Badge variant="secondary">{roleLabels[userRole]}</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{dept?.name || "—"}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setEditMember(m)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                        Nenhum membro encontrado
                      </TableCell>
                    </TableRow>
                  )}
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
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">
                      {dept.name} <span className="text-sm font-normal text-muted-foreground ml-2">{deptMembers.length}</span>
                    </CardTitle>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => setEditDept(dept)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex -space-x-2">
                      {deptMembers.slice(0, 3).map((m) => (
                        <Avatar key={m.id} className="h-8 w-8 border-2 border-card">
                          <AvatarFallback className="text-xs">{m.full_name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                      ))}
                      {deptMembers.length > 3 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs">
                          +{deptMembers.length - 3}
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
                            <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteInvite(inv.id)}>
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

        {(isAdmin || role === "manager") && currentProfile?.company_id && (
          <TabsContent value="links">
            <CoordinatorLinksTab
              members={members}
              links={coordLinks}
              companyId={currentProfile.company_id}
              onRefresh={fetchData}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Department Modal */}
      <Dialog open={deptModal} onOpenChange={setDeptModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Setor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Setor</Label>
              <Input autoFocus value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="Ex: Financeiro" />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Convidar Membro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input autoFocus type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                  {isAdmin && <SelectItem value="manager">Gerente</SelectItem>}
                  {(isAdmin || role === "manager") && <SelectItem value="coordinator">Coordenador</SelectItem>}
                  {(isAdmin || role === "manager" || role === "coordinator") && <SelectItem value="analyst">Analista</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {role !== "manager" && role !== "coordinator" && (
              <div className="space-y-2">
                <Label>
                  Setor{inviteForm.role !== "admin" && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Select value={inviteForm.department_id} onValueChange={(v) => setInviteForm({ ...inviteForm, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModal(false)}>Cancelar</Button>
            <Button onClick={sendInvite}><Send className="mr-2 h-4 w-4" /> Enviar Convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditMemberDialog
        open={!!editMember}
        onOpenChange={(open) => !open && setEditMember(null)}
        member={editMember}
        departments={departments}
        onSaved={fetchData}
      />

      <EditDepartmentDialog
        open={!!editDept}
        onOpenChange={(open) => !open && setEditDept(null)}
        department={editDept}
        onSaved={fetchData}
      />

      <ConfirmActionDialog
        open={!!confirmDeleteInvite}
        onConfirm={async () => {
          if (confirmDeleteInvite) {
            await supabase.from("invitations").delete().eq("id", confirmDeleteInvite);
            fetchData();
          }
          setConfirmDeleteInvite(null);
        }}
        onCancel={() => setConfirmDeleteInvite(null)}
        title="Excluir convite"
        description="Tem certeza que deseja excluir este convite? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
      />
    </div>
  );
}