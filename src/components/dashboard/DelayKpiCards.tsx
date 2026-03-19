import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Clock, TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subDays, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DelayRecord {
  id: string;
  task_id: string;
  user_id: string;
  log_type: string;
  scheduled_time: string;
  actual_time: string;
  delay_minutes: number;
  created_at: string;
}

interface DelayKpiCardsProps {
  tasks: { id: string; title?: string; status: string; start_date: string | null; due_date: string | null; department_id: string | null; assigned_to: string | null }[];
  selectedDepartment: string | null;
  selectedEmployee: string | null;
  referenceDate?: Date;
}

type Period = "hoje" | "semana" | "mes";
type ModalType = "inicio" | "conclusao" | null;

export default function DelayKpiCards({ tasks, selectedDepartment, selectedEmployee, referenceDate }: DelayKpiCardsProps) {
  const [delays, setDelays] = useState<DelayRecord[]>([]);
  const [period, setPeriod] = useState<Period>("semana");
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [profilesMap, setProfilesMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: delayData }, { data: profileData }] = await Promise.all([
        supabase.from("task_delays").select("*").order("created_at", { ascending: true }),
        supabase.from("profiles").select("id, full_name"),
      ]);
      if (delayData) setDelays(delayData as unknown as DelayRecord[]);
      if (profileData) {
        const map = new Map<string, string>();
        profileData.forEach((p: any) => map.set(p.id, p.full_name || "Sem nome"));
        setProfilesMap(map);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "hoje") return startOfDay(now);
    if (period === "semana") return startOfWeek(now, { weekStartsOn: 1 });
    return startOfMonth(now);
  }, [period]);

  const filteredTaskIds = useMemo(() => {
    let t = tasks;
    if (selectedDepartment) t = t.filter(x => x.department_id === selectedDepartment);
    if (selectedEmployee) t = t.filter(x => x.assigned_to === selectedEmployee);
    return new Set(t.map(x => x.id));
  }, [tasks, selectedDepartment, selectedEmployee]);

  const periodDelays = useMemo(() => {
    const startStr = periodStart.toISOString();
    return delays.filter(d =>
      d.created_at >= startStr && filteredTaskIds.has(d.task_id)
    );
  }, [delays, periodStart, filteredTaskIds]);

  const { startDelayPct, completionDelayPct, lateStartCount, lateCompletionCount, overdueNow, periodTaskCount, overduePct } = useMemo(() => {
    let filteredTasks = tasks;
    if (selectedDepartment) filteredTasks = filteredTasks.filter(t => t.department_id === selectedDepartment);
    if (selectedEmployee) filteredTasks = filteredTasks.filter(t => t.assigned_to === selectedEmployee);

    const refDate = referenceDate || new Date();
    const startStr = periodStart.toISOString();

    const tasksInPeriod = filteredTasks.filter(t => {
      const ref = t.due_date || t.start_date;
      return ref && ref >= startStr.slice(0, 10);
    });

    const overdue = tasksInPeriod.filter(t =>
      (t.status === "pending" || t.status === "in_progress") &&
      t.due_date && new Date(t.due_date) < refDate
    );

    const totalInPeriod = tasksInPeriod.length;
    const pct = totalInPeriod > 0 ? (overdue.length / totalInPeriod) * 100 : 0;

    const startedOrDone = filteredTasks.filter(t => t.status === "in_progress" || t.status === "completed").length;
    const completed = filteredTasks.filter(t => t.status === "completed").length;

    const lateStarts = periodDelays.filter(d => d.log_type === "inicio_atrasado");
    const lateCompletions = periodDelays.filter(d => d.log_type === "conclusao_atrasada");

    return {
      startDelayPct: startedOrDone > 0 ? Math.round((lateStarts.length / startedOrDone) * 100) : 0,
      completionDelayPct: completed > 0 ? Math.round((lateCompletions.length / completed) * 100) : 0,
      lateStartCount: lateStarts.length,
      lateCompletionCount: lateCompletions.length,
      overdueNow: overdue.length,
      periodTaskCount: totalInPeriod,
      overduePct: pct,
    };
  }, [tasks, periodDelays, selectedDepartment, selectedEmployee, periodStart]);

  const modalDelays = useMemo(() => {
    if (!modalType) return [];
    const logType = modalType === "inicio" ? "inicio_atrasado" : "conclusao_atrasada";
    return periodDelays
      .filter(d => d.log_type === logType)
      .sort((a, b) => b.delay_minutes - a.delay_minutes);
  }, [modalType, periodDelays]);

  const tasksMap = useMemo(() => {
    const map = new Map<string, typeof tasks[0]>();
    tasks.forEach(t => map.set(t.id, t));
    return map;
  }, [tasks]);

  const trendData = useMemo(() => {
    const now = new Date();
    const days: { date: string; label: string; inicio: number; conclusao: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, "yyyy-MM-dd");
      const label = format(day, "dd/MM", { locale: ptBR });
      const dayDelays = delays.filter(d =>
        d.created_at.startsWith(dayStr) && filteredTaskIds.has(d.task_id)
      );
      days.push({
        date: dayStr,
        label,
        inicio: dayDelays.filter(d => d.log_type === "inicio_atrasado").length,
        conclusao: dayDelays.filter(d => d.log_type === "conclusao_atrasada").length,
      });
    }
    return days;
  }, [delays, filteredTaskIds]);

  if (loading) return null;

  const periodLabel = period === "hoje" ? "hoje" : period === "semana" ? "esta semana" : "este mês";

  const formatDelayTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" />
          Monitoramento de Atrasos
        </h3>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="h-7">
            <TabsTrigger value="hoje" className="text-xs px-2 h-6">Hoje</TabsTrigger>
            <TabsTrigger value="semana" className="text-xs px-2 h-6">Semana</TabsTrigger>
            <TabsTrigger value="mes" className="text-xs px-2 h-6">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Resumo do período ({periodLabel})</span>
            <span className={`text-sm font-bold ${
              overduePct > 20 ? "text-destructive" : overduePct >= 10 ? "text-yellow-500" : "text-green-500"
            }`}>
              <FormulaTooltip formula="Atrasadas no período ÷ Total no período × 100" showIcon={false}>
                <span>{overdueNow} atrasadas / {periodTaskCount} total = {overduePct.toFixed(1)}%</span>
              </FormulaTooltip>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setModalType("inicio")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Início Atrasado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormulaTooltip formula="Inícios atrasados ÷ Tarefas iniciadas × 100">
              <div className="text-2xl font-bold">{startDelayPct}%</div>
            </FormulaTooltip>
            <p className="text-xs text-muted-foreground">
              {lateStartCount} tarefa{lateStartCount !== 1 ? "s" : ""} {periodLabel}
            </p>
            {periodTaskCount > 0 && (
              <p className={`text-xs font-medium mt-1 ${
                (lateStartCount / periodTaskCount) * 100 > 20 ? "text-destructive" :
                (lateStartCount / periodTaskCount) * 100 >= 10 ? "text-yellow-500" : "text-green-500"
              }`}>
                ({((lateStartCount / periodTaskCount) * 100).toFixed(1)}% do total)
              </p>
            )}
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setModalType("conclusao")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Conclusão Atrasada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormulaTooltip formula="Conclusões atrasadas ÷ Tarefas concluídas × 100">
              <div className="text-2xl font-bold">{completionDelayPct}%</div>
            </FormulaTooltip>
            <p className="text-xs text-muted-foreground">
              {lateCompletionCount} tarefa{lateCompletionCount !== 1 ? "s" : ""} {periodLabel}
            </p>
            {periodTaskCount > 0 && (
              <p className={`text-xs font-medium mt-1 ${
                (lateCompletionCount / periodTaskCount) * 100 > 20 ? "text-destructive" :
                (lateCompletionCount / periodTaskCount) * 100 >= 10 ? "text-yellow-500" : "text-green-500"
              }`}>
                ({((lateCompletionCount / periodTaskCount) * 100).toFixed(1)}% do total)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendência de Atrasos (30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              inicio: { label: "Início atrasado", color: "hsl(var(--chart-4))" },
              conclusao: { label: "Conclusão atrasada", color: "hsl(var(--chart-1))" },
            }}
            className="h-[200px] w-full"
          >
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="inicio" stackId="1" stroke="var(--color-inicio)" fill="var(--color-inicio)" fillOpacity={0.3} />
              <Area type="monotone" dataKey="conclusao" stackId="1" stroke="var(--color-conclusao)" fill="var(--color-conclusao)" fillOpacity={0.3} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Modal de detalhes de atrasos */}
      <Dialog open={modalType !== null} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalType === "inicio" ? (
                <><Clock className="h-5 w-5 text-orange-500" /> Tarefas com Início Atrasado</>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-destructive" /> Tarefas com Conclusão Atrasada</>
              )}
              <Badge variant="secondary" className="ml-2">{periodLabel}</Badge>
            </DialogTitle>
          </DialogHeader>

          {modalDelays.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum atraso registrado neste período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Atraso</TableHead>
                  <TableHead className="text-right">Data Prevista</TableHead>
                  <TableHead className="text-right">Data Real</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modalDelays.map((d) => {
                  const task = tasksMap.get(d.task_id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {task?.title || "Tarefa removida"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {profilesMap.get(d.user_id) || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={d.delay_minutes > 60 ? "destructive" : "secondary"}>
                          {formatDelayTime(d.delay_minutes)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(new Date(d.scheduled_time), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(new Date(d.actual_time), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
