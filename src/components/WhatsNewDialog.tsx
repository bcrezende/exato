import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Check, CheckCheck, BellOff } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

const categoryConfig: Record<string, { label: string; className: string }> = {
  feature: { label: "Novidade", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  improvement: { label: "Melhoria", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  fix: { label: "Correção", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  announcement: { label: "Comunicado", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismissForever: () => void;
}

export function WhatsNewDialog({ open, onOpenChange, onDismissForever }: Props) {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !user || !profile?.company_id) return;

    const load = async () => {
      const [{ data: entriesData }, { data: readsData }] = await Promise.all([
        supabase
          .from("changelog_entries")
          .select("id, title, content, category, created_at")
          .eq("company_id", profile.company_id!)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("changelog_reads")
          .select("changelog_id")
          .eq("user_id", user.id),
      ]);

      setReadIds(new Set((readsData || []).map((r: any) => r.changelog_id)));
      setEntries((entriesData as any) || []);
    };

    load();
  }, [open, user, profile?.company_id]);

  const markAsRead = async (entryId: string) => {
    if (!user) return;
    await supabase.from("changelog_reads").insert({ user_id: user.id, changelog_id: entryId });
    setReadIds((prev) => new Set([...prev, entryId]));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unread = entries.filter((e) => !readIds.has(e.id));
    if (unread.length === 0) return;
    const inserts = unread.map((e) => ({ user_id: user.id, changelog_id: e.id }));
    await supabase.from("changelog_reads").insert(inserts);
    setReadIds(new Set(entries.map((e) => e.id)));
  };

  const unreadCount = entries.filter((e) => !readIds.has(e.id)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Novidades
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {unreadCount} não lida{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Últimas atualizações e mudanças na plataforma</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 max-h-[50vh] pr-2">
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma novidade no momento.</p>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
                const cat = categoryConfig[entry.category] || categoryConfig.feature;
                const isUnread = !readIds.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    className={`rounded-lg border p-4 transition-colors ${isUnread ? "bg-accent/50 border-primary/30" : "bg-card opacity-75"}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={cat.className}>
                          {cat.label}
                        </Badge>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.created_at), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => markAsRead(entry.id)}
                            title="Marcar como lido"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{entry.title}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {entries.length > 0 && (
          <DialogFooter className="flex-row justify-between gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onDismissForever}
            >
              <BellOff className="h-4 w-4 mr-1.5" />
              Não mostrar mais
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1.5" />
                Marcar todas como lidas
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
