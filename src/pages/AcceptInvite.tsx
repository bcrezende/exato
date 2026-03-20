import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import logoDark from "@/assets/logo-dark-optimized.webp";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [invitation, setInvitation] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    supabase
      .from("invitations")
      .select("*, companies(name)")
      .eq("token", token)
      .is("accepted_at", null)
      .single()
      .then(({ data }) => {
        setInvitation(data);
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Erro", description: "Senha deve ter no mínimo 6 caracteres" });
      return;
    }
    setSubmitting(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (authError || !authData.user) {
      toast({ variant: "destructive", title: "Erro", description: authError?.message });
      setSubmitting(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc("handle_accept_invite", {
      _user_id: authData.user.id,
      _invitation_id: invitation.id,
      _full_name: fullName,
    });

    if (rpcError) {
      toast({ variant: "destructive", title: "Erro", description: rpcError.message });
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    toast({ title: "Conta criada!", description: "Faça login com suas credenciais para acessar o sistema." });
    navigate("/login");
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Convite inválido</CardTitle>
            <CardDescription>Este convite não existe ou já foi utilizado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login"><Button className="w-full">Ir para o login</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2">
          <img src={logoDark} alt="Exato" className="h-24 w-auto" />
          <p className="text-muted-foreground">
            Você foi convidado para <strong>{(invitation as any).companies?.name}</strong>
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Aceitar Convite</CardTitle>
            <CardDescription>Crie sua senha para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccept} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={invitation.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Seu Nome Completo</Label>
                <Input id="name" placeholder="João Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Criar Senha</Label>
                <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                <UserPlus className="mr-2 h-4 w-4" />
                {submitting ? "Criando conta..." : "Aceitar e Criar Conta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
