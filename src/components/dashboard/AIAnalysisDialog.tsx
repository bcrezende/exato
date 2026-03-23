import { useState, useMemo } from "react";
import { devError } from "@/lib/logger";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { BrainCircuit, Loader2, RotateCcw, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { subWeeks, subMonths, startOfDay, endOfDay, format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AnalysisType, analysisTypeLabels, fetchMetricsForPeriod, getPreviousPeriodDates } from "@/lib/analysis-utils";

interface Props {
  departments: { id: string; name: string }[];
  profiles: { id: string; full_name: string | null; department_id: string | null }[];
}

type Period = "today" | "week" | "month" | "custom";

const periodLabels: Record<Period, string> = {
  today: "Hoje",
  week: "Última semana",
  month: "Último mês",
  custom: "Personalizado",
};

export default function AIAnalysisDialog({ departments, profiles }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [sectorId, setSectorId] = useState<string>("all");
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("productivity");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const employeeOptions = useMemo(() => {
    let list = profiles;
    if (sectorId !== "all") list = list.filter((p) => p.department_id === sectorId);
    return list.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [profiles, sectorId]);

  const resetFilters = () => {
    setResult(null);
    setPeriod("today");
    setCustomFrom(undefined);
    setCustomTo(undefined);
    setSectorId("all");
    setEmployeeId("all");
    setAnalysisType("productivity");
    setCompareEnabled(false);
  };

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    if (period === "custom" && customFrom && customTo) {
      return { start: startOfDay(customFrom), end: endOfDay(customTo) };
    }
    const startMap: Record<string, Date> = {
      today: startOfDay(now),
      week: subWeeks(now, 1),
      month: subMonths(now, 1),
    };
    return { start: startMap[period], end: now };
  };

  const getPeriodLabel = (): string => {
    if (period === "custom" && customFrom && customTo) {
      return `${format(customFrom, "dd/MM/yyyy")} a ${format(customTo, "dd/MM/yyyy")}`;
    }
    return periodLabels[period];
  };

  const handleAnalyze = async () => {
    if (period === "custom" && (!customFrom || !customTo)) {
      toast({ title: "Selecione as datas", description: "Informe a data inicial e final.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { start, end } = getDateRange();
      const sectorName = sectorId === "all" ? "Todos os setores" : departments.find((d) => d.id === sectorId)?.name || sectorId;
      const employeeName = employeeId === "all" ? "Todos os analistas" : profiles.find((p) => p.id === employeeId)?.full_name || employeeId;

      const metrics = await fetchMetricsForPeriod(start.toISOString(), end.toISOString(), sectorId, employeeId);

      let previousMetrics = undefined;
      if (compareEnabled) {
        const prev = getPreviousPeriodDates(start, end);
        previousMetrics = await fetchMetricsForPeriod(prev.start.toISOString(), prev.end.toISOString(), sectorId, employeeId);
      }

      const { data, error } = await supabase.functions.invoke("generate-analysis", {
        body: {
          metrics,
          previousMetrics,
          filters: { periodLabel: getPeriodLabel(), sectorName, employeeName, analysisType },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.analysis);
    } catch (e: any) {
      devError(e);
      toast({ title: "Erro", description: e.message || "Falha ao gerar análise.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetFilters(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BrainCircuit className="h-4 w-4" />
          Análise IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Assistente de Análise
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Período</label>
                <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mês</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de Análise</label>
                <Select value={analysisType} onValueChange={(v) => setAnalysisType(v as AnalysisType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="productivity">📊 Produtividade</SelectItem>
                    <SelectItem value="bottlenecks">🔍 Gargalos</SelectItem>
                    <SelectItem value="team">👥 Equipe</SelectItem>
                    <SelectItem value="risks">⚠️ Riscos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Setor</label>
                <Select value={sectorId} onValueChange={(v) => { setSectorId(v); setEmployeeId("all"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Analista</label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {employeeOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {period === "custom" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">De</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customFrom ? format(customFrom, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} disabled={(date) => date > new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Até</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customTo ? format(customTo, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customTo} onSelect={setCustomTo} disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch checked={compareEnabled} onCheckedChange={setCompareEnabled} />
              <div>
                <p className="text-sm font-medium">Comparar com período anterior</p>
                <p className="text-xs text-muted-foreground">Análise comparativa com evolução</p>
              </div>
            </div>

            <Button onClick={handleAnalyze} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
              {loading ? "Analisando..." : "Gerar Análise"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <ScrollArea className="flex-1 rounded-lg border p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </ScrollArea>
            <Button variant="outline" onClick={resetFilters} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Nova Análise
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
