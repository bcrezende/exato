import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { devError } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { BrainCircuit, Loader2, RotateCcw, CalendarIcon, FileDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { subWeeks, subMonths, startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AnalysisHistoryTable } from "@/components/analysis/AnalysisHistoryTable";
import { AnalysisType, analysisTypeLabels, fetchMetricsForPeriod, getPreviousPeriodDates } from "@/lib/analysis-utils";

type Period = "today" | "week" | "month" | "custom";
type Profile = { id: string; full_name: string | null; department_id: string | null };
type Department = { id: string; name: string };

const periodLabels: Record<Period, string> = {
  today: "Hoje",
  week: "Última semana",
  month: "Último mês",
  custom: "Personalizado",
};

export default function Analysis() {
  const { user, role, profile: authProfile } = useAuth();
  const { toast } = useToast();
  const resultRef = useRef<HTMLDivElement>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [sectorId, setSectorId] = useState<string>("all");
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("productivity");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("analysis_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory(data || []);
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [depsRes, profilesRes] = await Promise.all([
        supabase.from("departments").select("id, name").order("name"),
        supabase.from("profiles").select("id, full_name, department_id"),
      ]);
      if (depsRes.data) {
        if (role === "manager" && authProfile?.department_id) {
          setDepartments(depsRes.data.filter(d => d.id === authProfile.department_id));
          setSectorId(authProfile.department_id);
        } else {
          setDepartments(depsRes.data);
        }
      }
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
      setLoadingData(false);
    };
    fetch();
    fetchHistory();
  }, [user, role, authProfile, fetchHistory]);

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
    setSectorId(role === "manager" && authProfile?.department_id ? authProfile.department_id : "all");
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
      toast({ title: "Selecione as datas", description: "Informe a data inicial e final para o período personalizado.", variant: "destructive" });
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

      const periodLabel = getPeriodLabel();

      const { data, error } = await supabase.functions.invoke("generate-analysis", {
        body: {
          metrics,
          previousMetrics,
          filters: { periodLabel, sectorName, employeeName, analysisType },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.analysis);

      if (data.analysis && authProfile?.company_id) {
        await supabase.from("analysis_history").insert({
          user_id: user!.id,
          company_id: authProfile.company_id,
          period_label: periodLabel,
          sector_name: sectorName,
          employee_name: employeeName,
          content: data.analysis,
        });
        fetchHistory();
      }
    } catch (e: any) {
      devError(e);
      toast({ title: "Erro", description: e.message || "Falha ao gerar análise.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!resultRef.current) return;
    setExportingPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = resultRef.current;
      const periodLabel = getPeriodLabel();
      const sectorName = sectorId === "all" ? "Todos os setores" : departments.find((d) => d.id === sectorId)?.name || sectorId;
      const employeeName = employeeId === "all" ? "Todos os analistas" : profiles.find((p) => p.id === employeeId)?.full_name || employeeId;

      const wrapper = document.createElement("div");
      wrapper.style.padding = "20px";
      wrapper.style.fontFamily = "sans-serif";
      wrapper.innerHTML = `
        <div style="border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px;">
          <h1 style="margin:0; font-size:20px;">Análise de ${analysisTypeLabels[analysisType]}</h1>
          <p style="margin:4px 0 0; color:#666; font-size:13px;">
            Período: ${periodLabel} | Setor: ${sectorName} | Analista: ${employeeName}
            ${compareEnabled ? " | Com comparativo" : ""}
          </p>
          <p style="margin:2px 0 0; color:#999; font-size:11px;">Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
        </div>
      `;
      const content = element.cloneNode(true) as HTMLElement;
      wrapper.appendChild(content);

      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `analise-${analysisType}-${format(new Date(), "yyyy-MM-dd")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(wrapper).save();

      toast({ title: "PDF exportado com sucesso!" });
    } catch (e: any) {
      devError(e);
      toast({ title: "Erro ao exportar", description: e.message, variant: "destructive" });
    } finally {
      setExportingPdf(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-primary" />
          Análise IA
        </h1>
        <p className="text-muted-foreground">Configure os filtros e gere uma análise de produtividade com inteligência artificial.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros da Análise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    <Calendar
                      mode="single"
                      selected={customFrom}
                      onSelect={setCustomFrom}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
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
                    <Calendar
                      mode="single"
                      selected={customTo}
                      onSelect={setCustomTo}
                      disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={compareEnabled} onCheckedChange={setCompareEnabled} />
            <div>
              <p className="text-sm font-medium">Comparar com período anterior</p>
              <p className="text-xs text-muted-foreground">A IA irá comparar os dados com o período equivalente anterior e destacar a evolução</p>
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
            {loading ? "Analisando..." : "Gerar Análise"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                Resultado da Análise
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportingPdf} className="gap-2">
                  {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Exportar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Nova Análise
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[60vh]">
              <div ref={resultRef} className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <AnalysisHistoryTable history={history} onDeleted={fetchHistory} />
    </div>
  );
}
