import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Building, RefreshCw, CalendarDays } from "lucide-react";
import RecurrenceSettings from "@/components/settings/RecurrenceSettings";
import HolidaySettings from "@/components/settings/HolidaySettings";

export default function Settings() {
  const { user, role, profile } = useAuth();
  const { toast } = useToast();
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", position: "" });
  const [companyName, setCompanyName] = useState("");
  const [companyTimezone, setCompanyTimezone] = useState("America/Sao_Paulo");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileForm({ full_name: profile.full_name || "", phone: profile.phone || "", position: profile.position || "" });
    }
  }, [profile]);

  useEffect(() => {
    if (role === "admin" && profile?.company_id) {
      supabase.from("companies").select("name, timezone").eq("id", profile.company_id).single().then(({ data }) => {
        if (data) {
          setCompanyName(data.name);
          setCompanyTimezone(data.timezone || "America/Sao_Paulo");
        }
      });
    }
  }, [role, profile?.company_id]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profileForm.full_name.trim() || null,
      phone: profileForm.phone.trim() || null,
      position: profileForm.position.trim() || null,
    }).eq("id", user.id);
    if (error) toast({ variant: "destructive", title: "Erro", description: error.message });
    else toast({ title: "Perfil atualizado!" });
    setSaving(false);
  };

  const saveCompany = async () => {
    if (!profile?.company_id) return;
    setSaving(true);
    const { error } = await supabase.from("companies").update({ name: companyName.trim(), timezone: companyTimezone }).eq("id", profile.company_id);
    if (error) toast({ variant: "destructive", title: "Erro", description: error.message });
    else toast({ title: "Empresa atualizada!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie seu perfil e configurações da conta</p>
      </div>

      <Tabs defaultValue="profile" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> Perfil</TabsTrigger>
          {role === "admin" && <TabsTrigger value="company"><Building className="mr-2 h-4 w-4" /> Empresa</TabsTrigger>}
          {role === "admin" && <TabsTrigger value="recurrences"><RefreshCw className="mr-2 h-4 w-4" /> Recorrências</TabsTrigger>}
          {role === "admin" && <TabsTrigger value="holidays"><CalendarDays className="mr-2 h-4 w-4" /> Feriados</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={profileForm.position} onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })} placeholder="Ex: Analista de Marketing" />
              </div>
              <Button onClick={saveProfile} disabled={saving}>{saving ? "Salvando..." : "Salvar Perfil"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {role === "admin" && (
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>Edite as informações da sua empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fuso Horário</Label>
                  <Select value={companyTimezone} onValueChange={setCompanyTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">Brasília (UTC-3)</SelectItem>
                      <SelectItem value="America/Manaus">Manaus (UTC-4)</SelectItem>
                      <SelectItem value="America/Rio_Branco">Rio Branco (UTC-5)</SelectItem>
                      <SelectItem value="America/Noronha">Fernando de Noronha (UTC-2)</SelectItem>
                      <SelectItem value="America/Fortaleza">Fortaleza (UTC-3)</SelectItem>
                      <SelectItem value="America/Cuiaba">Cuiabá (UTC-4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveCompany} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {role === "admin" && (
          <TabsContent value="recurrences">
            <RecurrenceSettings />
          </TabsContent>
        )}

        {role === "admin" && (
          <TabsContent value="holidays">
            <HolidaySettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}