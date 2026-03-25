import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles } from "lucide-react";
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
}

export function WhatsNewDialog({ open, onOpenChange }: Props) {
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

      const reads = new Set((readsData || []).map((r: any) => r.changelog_id));
      setReadIds(reads);
      setEntries((entriesData as any) || []);

      // Mark unread entries as read
      const unread = ((entriesData as any) || []).filter((e: ChangelogEntry) => !reads.has(e.id));
      if (unread.length > 0) {
        const inserts = unread.map((e: ChangelogEntry) => ({
          user_id: user.id,
          changelog_id: e.id,
        }));
        await supabase.from("changelog_reads").insert(inserts);
      }
    };

    load();
  }, [open, user, profile?.company_id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Novidades
          </DialogTitle>
          <DialogDescription>Últimas atualizações e mudanças na plataforma</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
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
                    className={`rounded-lg border p-4 transition-colors ${isUnread ? "bg-accent/50 border-primary/30" : "bg-card"}`}
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
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.created_at), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{entry.title}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
