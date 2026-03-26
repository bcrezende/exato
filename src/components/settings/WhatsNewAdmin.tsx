import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

const categoryOptions = [
  { value: "feature", label: "Novidade" },
  { value: "improvement", label: "Melhoria" },
  { value: "fix", label: "Correção" },
  { value: "announcement", label: "Comunicado" },
];

const categoryBadge: Record<string, string> = {
  feature: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  improvement: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  fix: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  announcement: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export default function WhatsNewAdmin() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("feature");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from("changelog_entries")
      .select("id, title, content, category, created_at")
      .order("created_at", { ascending: false });
    setEntries((data as any) || []);
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleCreate = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("changelog_entries").insert({
      title: title.trim(),
      content: content.trim(),
      category: category as any,
      created_by: user.id,
    } as any);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Novidade publicada!" });
      setTitle("");
      setContent("");
      setCategory("feature");
      fetchEntries();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("changelog_entries").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Erro", description: error.message });
    else fetchEntries();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nova Entrada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Nova funcionalidade de relatórios" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Descreva a novidade..." rows={4} />
          </div>
          <Button onClick={handleCreate} disabled={saving || !title.trim() || !content.trim()}>
            <Sparkles className="mr-2 h-4 w-4" />
            {saving ? "Publicando..." : "Publicar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entradas Publicadas ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma entrada publicada.</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={categoryBadge[entry.category]}>
                        {categoryOptions.find((o) => o.value === entry.category)?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm">{entry.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{entry.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(entry.id)} className="shrink-0 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    <ConfirmActionDialog
      open={!!confirmDeleteId}
      onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
      onCancel={() => setConfirmDeleteId(null)}
      title="Excluir novidade"
      description="Tem certeza que deseja excluir esta entrada? Esta ação não pode ser desfeita."
      confirmLabel="Excluir"
      variant="destructive"
    />
    </>
  );
}
