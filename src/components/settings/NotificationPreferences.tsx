import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const NOTIFICATION_TYPES = [
  { key: "reminder_5min", label: "Lembrete 5 min antes", description: "Receber aviso 5 minutos antes do início da tarefa" },
  { key: "late_start", label: "Início atrasado", description: "Tarefa não iniciada no horário previsto" },
  { key: "overdue", label: "Prazo excedido", description: "Tarefa com prazo vencido sem conclusão" },
  { key: "in_progress_overdue", label: "Em andamento + prazo excedido", description: "Tarefa em andamento que passou do prazo final" },
  { key: "previous_day_unstarted", label: "Tarefa de ontem sem início", description: "Tarefa do dia anterior que não foi iniciada" },
] as const;

type PrefKey = typeof NOTIFICATION_TYPES[number]["key"];

export default function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    reminder_5min: true,
    late_start: true,
    overdue: true,
    in_progress_overdue: true,
    previous_day_unstarted: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            reminder_5min: data.reminder_5min ?? true,
            late_start: data.late_start ?? true,
            overdue: data.overdue ?? true,
            in_progress_overdue: data.in_progress_overdue ?? true,
            previous_day_unstarted: data.previous_day_unstarted ?? true,
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleToggle = async (key: PrefKey, checked: boolean) => {
    if (!user) return;
    const newPrefs = { ...prefs, [key]: checked };
    setPrefs(newPrefs);

    const { error } = await supabase
      .from("user_notification_preferences")
      .upsert(
        { user_id: user.id, ...newPrefs } as any,
        { onConflict: "user_id" }
      );

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      setPrefs((prev) => ({ ...prev, [key]: !checked }));
    } else {
      toast({ title: checked ? "Notificação ativada" : "Notificação desativada" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações por Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Escolha quais notificações por email você deseja receber sobre suas tarefas.
        </p>
        {NOTIFICATION_TYPES.map((type) => (
          <div key={type.key} className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>{type.label}</Label>
              <p className="text-xs text-muted-foreground">{type.description}</p>
            </div>
            <Switch
              checked={prefs[type.key]}
              onCheckedChange={(checked) => handleToggle(type.key, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
