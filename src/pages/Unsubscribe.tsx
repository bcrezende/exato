import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, MailX } from "lucide-react";

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        if (res.ok && data.valid === true) setStatus("valid");
        else if (data.reason === "already_unsubscribed") setStatus("already_unsubscribed");
        else setStatus("invalid");
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already_unsubscribed");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Gerenciar Notificações</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Validando...</p>
            </div>
          )}

          {status === "valid" && (
            <>
              <MailX className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Deseja cancelar o recebimento de notificações por email?
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar Cancelamento
              </Button>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <p className="text-muted-foreground">
                Você foi removido das notificações por email com sucesso.
              </p>
            </>
          )}

          {status === "already_unsubscribed" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Este email já foi removido das notificações anteriormente.
              </p>
            </>
          )}

          {status === "invalid" && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="text-muted-foreground">
                Link inválido ou expirado.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="text-muted-foreground">
                Ocorreu um erro. Tente novamente mais tarde.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
