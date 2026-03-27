import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminPeriodToggle, { type AdminPeriod } from "@/components/dashboard/admin/AdminPeriodToggle";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { nowAsFakeUTC } from "@/lib/date-utils";
import { ClipboardList, AlertTriangle, Clock, CheckCircle2, XCircle, TimerOff, ChevronDown, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";

type Task = {
  id: string;
  title: string;
  status: string;
  assigned_to: string | null;
  department_id: string | null;
  start_date: string | null;
  due_date: string | null;
  company_id: string;
};

type Delay = {
  task_id: string;
  log_type: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  department_id: string | null;
};

type Department = {
  id: string;
  name: string;
};

export default function AuditDashboard() {
  const { profile, role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [delays, setDelays] = useState<Delay[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<AdminPeriod>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      if (!profile?.company_id) return;

      const [tasksRes, delaysRes, profilesRes, deptsRes] = await Promise.all([
        supabase.from("tasks").select("id, title, status, assigned_to, department_id, start_date, due_date, company_id"),
        supabase.from("task_delays").select("task_id, log_type"),
        supabase.from("profiles").select("id, full_name, department_id").eq("company_id", profile.company_id),
        supabase.from("departments").select("id, name").eq("company_id", profile.company_id),
      ]);

      setTasks((tasksRes.data || []) as Task[]);
      setDelays((delaysRes.data || []) as Delay[]);
      setProfiles(profilesRes.data || []);
      setDepartments(deptsRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, [profile?.company_id]);

  // Coordinator analyst IDs
  const [coordinatorAnalystIds, setCoordinatorAnalystIds] = useState<string[]>([]);
  useEffect(() => {
    if (role === "coordinator" && profile?.id) {
      supabase.rpc("get_coordinator_analyst_ids", { _coordinator_id: profile.id }).then(({ data }) => {
        setCoordinatorAnalystIds((data as string[]) || []);
      });
    }
  }, [role, profile?.id]);

  const { periodStart, periodEnd } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (period) {
      case "yesterday":
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        start = startOfMonth(now);
        break;
      case "custom":
        start = customStart ? new Date(customStart) : startOfDay(now);
        end = customEnd ? new Date(customEnd + "T23:59:59") : endOfDay(now);
        break;
      default:
        start = startOfDay(now);
    }
    return { periodStart: start!.toISOString(), periodEnd: end.toISOString() };
  }, [period, customStart, customEnd]);

  // Filter tasks by role visibility
  const visibleTasks = useMemo(() => {
    let filtered = tasks;
    if (role === "manager" && profile?.department_id) {
      filtered = filtered.filter((t) => t.department_id === profile.department_id);
    } else if (role === "coordinator") {
      const ids = new Set(coordinatorAnalystIds);
      filtered = filtered.filter((t) => t.assigned_to && ids.has(t.assigned_to));
    }
    return filtered;
  }, [tasks, role, profile?.department_id, coordinatorAnalystIds]);

  // Filter by period
  const periodTasks = useMemo(() => {
    return visibleTasks.filter((t) => {
      const start = t.start_date || t.due_date;
      const due = t.due_date || t.start_date;
      if (!start && !due) return false;
      return (start && start >= periodStart && start <= periodEnd) ||
             (due && due >= periodStart && due <= periodEnd);
    });
  }, [visibleTasks, periodStart, periodEnd]);

  // Filter by selected department
  const deptFilteredTasks = useMemo(() => {
    if (selectedDepartment === "all") return periodTasks;
    return periodTasks.filter((t) => t.department_id === selectedDepartment);
  }, [periodTasks, selectedDepartment]);

  // Filter by selected user
  const filteredTasks = useMemo(() => {
    if (selectedUser === "all") return deptFilteredTasks;
    return deptFilteredTasks.filter((t) => t.assigned_to === selectedUser);
  }, [deptFilteredTasks, selectedUser]);

  // Available users for filter
  const visibleUsers = useMemo(() => {
    const userIds = new Set(periodTasks.map((t) => t.assigned_to).filter(Boolean));
    return profiles.filter((p) => userIds.has(p.id)).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [periodTasks, profiles]);

  const delaySet = useMemo(() => {
    const map = new Map<string, Set<string>>();
    delays.forEach((d) => {
      if (!map.has(d.task_id)) map.set(d.task_id, new Set());
      map.get(d.task_id)!.add(d.log_type);
    });
    return map;
  }, [delays]);

  const nowISO = nowAsFakeUTC();

  // KPI calculations
  const kpis = useMemo(() => {
    const total = filteredTasks.length;
    const notDone = filteredTasks.filter((t) => t.status === "not_done").length;
    const taskIds = new Set(filteredTasks.map((t) => t.id));
    const lateStart = filteredTasks.filter((t) => delaySet.get(t.id)?.has("inicio_atrasado")).length;
    const lateCompletion = filteredTasks.filter((t) => delaySet.get(t.id)?.has("conclusao_atrasada")).length;
    const completed = filteredTasks.filter((t) => t.status === "completed");
    const completedOnTime = completed.filter((t) => !delaySet.get(t.id)?.has("conclusao_atrasada")).length;
    const notCompleted = filteredTasks.filter(
      (t) => (t.status === "pending" || t.status === "in_progress") && t.due_date && t.due_date < nowISO
    ).length;

    return { total, notDone, lateStart, lateCompletion, completedOnTime, notCompleted };
  }, [filteredTasks, delaySet, nowISO]);

  // Sector breakdown
  const sectorData = useMemo(() => {
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const sectors: {
      deptId: string;
      deptName: string;
      total: number;
      notDone: number;
      lateStart: number;
      lateCompletion: number;
      completedOnTime: number;
      notCompleted: number;
      users: {
        userId: string;
        userName: string;
        total: number;
        notDone: number;
        lateStart: number;
        lateCompletion: number;
        completedOnTime: number;
        notCompleted: number;
      }[];
    }[] = [];

    const byDept = new Map<string, Task[]>();
    filteredTasks.forEach((t) => {
      const key = t.department_id || "sem-setor";
      if (!byDept.has(key)) byDept.set(key, []);
      byDept.get(key)!.push(t);
    });

    for (const [deptId, deptTasks] of byDept) {
      const deptName = deptMap.get(deptId) || "Sem Setor";

      const calcMetrics = (ts: Task[]) => {
        const completed = ts.filter((t) => t.status === "completed");
        return {
          total: ts.length,
          notDone: ts.filter((t) => t.status === "not_done").length,
          lateStart: ts.filter((t) => delaySet.get(t.id)?.has("inicio_atrasado")).length,
          lateCompletion: ts.filter((t) => delaySet.get(t.id)?.has("conclusao_atrasada")).length,
          completedOnTime: completed.filter((t) => !delaySet.get(t.id)?.has("conclusao_atrasada")).length,
          notCompleted: ts.filter(
            (t) => (t.status === "pending" || t.status === "in_progress") && t.due_date && t.due_date < nowISO
          ).length,
        };
      };

      const byUser = new Map<string, Task[]>();
      deptTasks.forEach((t) => {
        const uid = t.assigned_to || "sem-usuario";
        if (!byUser.has(uid)) byUser.set(uid, []);
        byUser.get(uid)!.push(t);
      });

      const users = Array.from(byUser.entries()).map(([userId, userTasks]) => {
        const p = profileMap.get(userId);
        return {
          userId,
          userName: p?.full_name || "Sem Responsável",
          ...calcMetrics(userTasks),
        };
      }).sort((a, b) => b.total - a.total);

      sectors.push({
        deptId,
        deptName,
        ...calcMetrics(deptTasks),
        users,
      });
    }

    return sectors.sort((a, b) => b.total - a.total);
  }, [filteredTasks, departments, profiles, delaySet, nowISO]);

  // Visible departments for filter
  const visibleDepartments = useMemo(() => {
    if (role === "manager" && profile?.department_id) {
      return departments.filter((d) => d.id === profile.department_id);
    }
    if (role === "coordinator") return [];
    return departments;
  }, [departments, role, profile?.department_id]);

  if (loading) return <DashboardSkeleton />;

  const kpiCards = [
    { label: "Total de Tarefas", value: kpis.total, icon: ClipboardList, color: "text-primary", tooltip: "Todas as tarefas do período selecionado" },
    { label: "Não Executadas", value: kpis.notDone, icon: XCircle, color: "text-orange-600", tooltip: "Tarefas com status \"não feita\" — marcadas automaticamente quando não iniciadas até o fim do dia" },
    { label: "Início Atrasado", value: kpis.lateStart, icon: Clock, color: "text-amber-500", tooltip: "Tarefas que foram iniciadas após o horário previsto de início (start_date)" },
    { label: "Concluídas Atrasadas", value: kpis.lateCompletion, icon: TimerOff, color: "text-destructive", tooltip: "Tarefas concluídas após o prazo final (due_date)" },
    { label: "Concluídas no Prazo", value: kpis.completedOnTime, icon: CheckCircle2, color: "text-emerald-500", tooltip: "Tarefas concluídas dentro do prazo final" },
    { label: "Não Concluídas", value: kpis.notCompleted, icon: AlertTriangle, color: "text-destructive", tooltip: "Tarefas pendentes ou em andamento cujo prazo final já passou" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
        <AdminPeriodToggle value={period} onChange={setPeriod} />
      </div>

      {period === "custom" && (
        <div className="flex gap-3 items-center">
          <label className="text-sm text-muted-foreground">Início:</label>
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background" />
          <label className="text-sm text-muted-foreground">Fim:</label>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background" />
        </div>
      )}

      {visibleDepartments.length > 0 && (
        <div className="flex items-center gap-3">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {visibleDepartments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* KPI Cards */}
      <TooltipProvider>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {kpiCards.map((kpi) => (
            <Tooltip key={kpi.label}>
              <TooltipTrigger asChild>
                <Card className="cursor-default">
                  <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                    <kpi.icon className={`h-6 w-6 mb-2 ${kpi.color}`} />
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p>{kpi.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Sector table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Detalhamento por Setor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sectorData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tarefa encontrada no período.</p>
          ) : (
            <div className="space-y-2">
              {sectorData.map((sector) => (
                <Collapsible key={sector.deptId}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                      <span className="font-medium">{sector.deptName}</span>
                      <Badge variant="secondary">{sector.total} tarefas</Badge>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-md border px-2 py-1 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
                        <XCircle className="h-3 w-3 text-orange-600" />
                        <span className="text-xs font-medium text-orange-600">{sector.notDone}</span>
                        <span className="text-[10px] text-orange-500">não exec.</span>
                      </div>
                      <div className="flex items-center gap-1 rounded-md border px-2 py-1 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                        <Clock className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-medium text-amber-500">{sector.lateStart}</span>
                        <span className="text-[10px] text-amber-400">início atras.</span>
                      </div>
                      <div className="flex items-center gap-1 rounded-md border px-2 py-1 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        <span className="text-xs font-medium text-destructive">{sector.lateCompletion}</span>
                        <span className="text-[10px] text-red-400">concl. atras.</span>
                      </div>
                      <div className="flex items-center gap-1 rounded-md border px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-500">{sector.completedOnTime}</span>
                        <span className="text-[10px] text-emerald-400">no prazo</span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Não Exec.</TableHead>
                            <TableHead className="text-center">Início Atras.</TableHead>
                            <TableHead className="text-center">Concl. Atras.</TableHead>
                            <TableHead className="text-center">No Prazo</TableHead>
                            <TableHead className="text-center">Não Concl.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sector.users.map((user) => (
                            <TableRow key={user.userId}>
                              <TableCell className="font-medium">{user.userName}</TableCell>
                              <TableCell className="text-center">{user.total}</TableCell>
                              <TableCell className="text-center text-orange-600">{user.notDone || "—"}</TableCell>
                              <TableCell className="text-center text-amber-500">{user.lateStart || "—"}</TableCell>
                              <TableCell className="text-center text-destructive">{user.lateCompletion || "—"}</TableCell>
                              <TableCell className="text-center text-emerald-500">{user.completedOnTime || "—"}</TableCell>
                              <TableCell className="text-center text-destructive">{user.notCompleted || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
