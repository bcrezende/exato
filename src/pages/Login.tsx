import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";
import logoDark from "@/assets/logo-dark-optimized.webp";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { identityReady, user, profileError } = useAuth();

  // Redirect when identity is fully ready (not just authenticated)
  useEffect(() => {
    if (user && identityReady) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, identityReady, navigate]);

  // Reset loading state if profile fetch fails after successful auth
  useEffect(() => {
    if (profileError && loading) {
      setLoading(false);
      toast({ variant: "destructive", title: "Erro ao carregar perfil", description: "O servidor está lento. Tente novamente em alguns segundos." });
    }
  }, [profileError, loading, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("LOGIN_TIMEOUT")), 15000)
        ),
      ]);
      if (result.error) {
        toast({ variant: "destructive", title: "Erro ao entrar", description: result.error.message });
        setLoading(false);
      }
      // On success, the AuthContext listener will set identityReady → useEffect redirects
    } catch (err: any) {
      const isTimeout = err?.message === "LOGIN_TIMEOUT";
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: isTimeout
          ? "O servidor demorou para responder. Tente novamente em alguns segundos."
          : "Falha na conexão. Tente novamente.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2">
          <img src={logoDark} alt="Exato" className="h-32 w-auto" width={128} height={128} fetchPriority="high" />
          <p className="text-muted-foreground">Monitoramento de Tarefas Corporativas</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Entrar na sua conta</CardTitle>
            <CardDescription>Digite suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">Esqueceu a senha?</Link>
                </div>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          Primeiro acesso? <Link to="/register" className="text-primary hover:underline">Criar conta de administrador</Link>
        </p>
      </div>
    </div>
  );
}
