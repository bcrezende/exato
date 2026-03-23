import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BrasilAPIHoliday {
  date: string;
  name: string;
  type: string;
}

const MOBILE_HOLIDAYS = [
  "Carnaval",
  "Sexta-Feira Santa",
  "Páscoa",
  "Corpus Christi",
];

function isMobileHoliday(name: string) {
  return MOBILE_HOLIDAYS.some((m) => name.toLowerCase().includes(m.toLowerCase()));
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingDates: string[];
  onImported: () => void;
}

export default function ImportBrazilHolidaysDialog({ open, onOpenChange, existingDates, onImported }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [holidays, setHolidays] = useState<BrasilAPIHoliday[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    fetchHolidays(year);
  }, [open, year]);

  const fetchHolidays = async (y: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${y}`);
      if (!res.ok) throw new Error("Erro ao buscar feriados");
      const data: BrasilAPIHoliday[] = await res.json();
      setHolidays(data);
      const newSelected = new Set<string>();
      data.forEach((h) => {
        if (!existingDates.includes(h.date)) newSelected.add(h.date);
      });
      setSelected(newSelected);
    } catch {
      toast({ variant: "destructive", title: "Erro ao buscar feriados da BrasilAPI" });
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (date: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const handleImport = async () => {
    if (!profile?.company_id || selected.size === 0) return;
    setImporting(true);
    const rows = holidays
      .filter((h) => selected.has(h.date))
      .map((h) => ({
        company_id: profile.company_id!,
        name: h.name,
        holiday_date: h.date,
        is_recurring: !isMobileHoliday(h.name),
      }));

    const { error } = await supabase.from("company_holidays").insert(rows);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao importar", description: error.message });
    } else {
      toast({ title: `${rows.length} feriado(s) importado(s)!` });
      onImported();
      onOpenChange(false);
    }
    setImporting(false);
  };

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Feriados Nacionais (Brasil)</DialogTitle>
          <DialogDescription>Selecione o ano e os feriados que deseja importar</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium">Ano:</span>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
              <SelectItem value={String(currentYear + 1)}>{currentYear + 1}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => {
                  const exists = existingDates.includes(h.date);
                  return (
                    <TableRow key={h.date} className={exists ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(h.date)}
                          disabled={exists}
                          onCheckedChange={() => toggleSelect(h.date)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell>{formatDate(h.date)}</TableCell>
                      <TableCell>
                        {exists ? (
                          <Badge variant="outline" className="text-muted-foreground">Já cadastrado</Badge>
                        ) : isMobileHoliday(h.name) ? (
                          <Badge variant="secondary">Móvel</Badge>
                        ) : (
                          <Badge>Fixo</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={importing || selected.size === 0}>
            {importing ? "Importando..." : `Importar ${selected.size} feriado(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
