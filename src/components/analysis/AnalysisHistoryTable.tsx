import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, History, Trash2, Loader2 } from "lucide-react";
import { AnalysisHistoryDialog } from "./AnalysisHistoryDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnalysisRecord {
  id: string;
  period_label: string | null;
  sector_name: string | null;
  employee_name: string | null;
  content: string;
  created_at: string;
}

interface Props {
  history: AnalysisRecord[];
  onDeleted: () => void;
}

function downloadTxt(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalysisHistoryTable({ history, onDeleted }: Props) {
  const { toast } = useToast();
  const [viewItem, setViewItem] = useState<AnalysisRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("analysis_history").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Falha ao excluir análise.", variant: "destructive" });
    } else {
      toast({ title: "Análise excluída" });
      onDeleted();
    }
    setDeletingId(null);
  };

  if (history.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Análises
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Analista</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{item.period_label || "—"}</TableCell>
                  <TableCell>{item.sector_name || "—"}</TableCell>
                  <TableCell>{item.employee_name || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewItem(item)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadTxt(item.content, `analise-${format(new Date(item.created_at), "yyyy-MM-dd-HHmm")}.txt`)}
                        title="Download TXT"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        title="Excluir"
                      >
                        {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AnalysisHistoryDialog
        open={!!viewItem}
        onOpenChange={(open) => !open && setViewItem(null)}
        content={viewItem?.content || null}
        title={viewItem ? `Análise de ${format(new Date(viewItem.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}` : ""}
      />
    </>
  );
}
