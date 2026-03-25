import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { WhatsNewDialog } from "./WhatsNewDialog";

export function WhatsNewBell() {
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchUnread = async () => {
    if (!user || !profile?.company_id) return;

    // Get read entry IDs
    const { data: reads } = await supabase
      .from("changelog_reads")
      .select("changelog_id")
      .eq("user_id", user.id);

    const readIds = (reads || []).map((r: any) => r.changelog_id);

    // Count entries not in read list
    let query = supabase
      .from("changelog_entries")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id);

    if (readIds.length > 0) {
      query = query.not("id", "in", `(${readIds.join(",")})`);
    }

    const { count } = await query;
    setUnreadCount(count || 0);
  };

  useEffect(() => {
    fetchUnread();

    const channel = supabase
      .channel("changelog-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "changelog_entries" }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, profile?.company_id]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label="Novidades"
      >
        <Sparkles className={`h-5 w-5 ${unreadCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-pulse">
            {unreadCount}
          </span>
        )}
      </Button>
      <WhatsNewDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) fetchUnread();
        }}
      />
    </>
  );
}
