import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { devError } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfDay, startOfWeek, startOfMonth, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import AdminPeriodToggle, { type AdminPeriod } from "@/components/dashboard/admin/AdminPeriodToggle";
import AdminKpiCards from "@/components/dashboard/admin/AdminKpiCards";
import AdminSectorCards from "@/components/dashboard/admin/AdminSectorCards";
import AdminUserRanking from "@/components/dashboard/admin/AdminUserRanking";
import AdminOverviewCards, { type OverviewFilter } from "@/components/dashboard/admin/AdminOverviewCards";
import DelayKpiCards from "@/components/dashboard/DelayKpiCards";
import SectorComparisonCard from "@/components/dashboard/SectorComparisonCard";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import AIAnalysisDialog from "@/components/dashboard/AIAnalysisDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Building2, BarChart3, Users, AlertCircle, LayoutDashboard, X, Search, CalendarIcon } from "lucide-react";
import { formatStoredDate } from "@/lib/date-utils";

const LazyPerformanceAnalytics = lazy(() => import("@/components/dashboard/PerformanceAnalytics"));

type Task = Tables<"tasks">;
type Profile = { id: string; full_name: string | null; department_id: string | null };
type DelayRecord = { id: string; task_id: string; user_id: string; log_type: string; created_at: string };

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [timeLogs, setTimeLogs] = useState<{ id: string; task_id: string; user_id: string; action: string; created_at: string }[]>([]);
  const [delays, setDelays] = useState<DelayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [period, setPeriod] = useState<AdminPeriod>("today");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [deptSearch, setDeptSearch] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [activeTab, setActiveTab] = useState("geral");
  const [overviewFilter, setOverviewFilter] = useState<OverviewFilter | null>(null);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const TASK_COLS = "id,title,status,priority,due_date,start_date,assigned_to,department_id,recurrence_type,estimated_minutes,created_by,created_at,recurrence_parent_id,justification,difficulty_rating,updated_at,description,company_id" as const;

  const handleRefresh = () => {
    supabase.from("tasks").select(TASK_COLS).order("due_date", { ascending: true }).then(({ data }) => {
      if (data) setTasks(data as unknown as Task[]);
    });
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          supabase.from("tasks").select(TASK_COLS).order("due_date", { ascending: true }),
          supabase.from("profiles").select("id, full_name, department_id"),
          supabase.from("departments").select("id, name").order("name"),
          supabase.from("task_time_logs").select("id, task_id, user_id, action, created_at").order("created_at", { ascending: true }).gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from("task_delays").select("id, task_id, user_id, log_type, created_at").order("created_at", { ascending: true }),
        ]);
        const [tasksRes, profilesRes, depsRes, logsRes, delaysRes] = results;
        if (tasksRes.status === "fulfilled" && tasksRes.value.data) setTasks(tasksRes.value.data);
        if (depsRes.status === "fulfilled" && depsRes.value.data) setDepartments(depsRes.value.data);
        if (logsRes.status === "fulfilled" && logsRes.value.data) setTimeLogs(logsRes.value.data);
        if (delaysRes.status === "fulfilled" && delaysRes.value.data) setDelays(delaysRes.value.data as DelayRecord[]);
        if (profilesRes.status === "fulfilled" && profilesRes.value.data) {
          const map = new Map<string, string>();
          profilesRes.value.data.forEach((p: Profile) => map.set(p.id, p.full_name || "Sem nome"));
          setProfiles(map);
          setProfilesList(profilesRes.value.data as Profile[]);
        }
      } catch (err) {
        devError("Admin dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  // Period date range
  const { periodStart, periodEnd } = useMemo(() => {
    const now = startOfDay(new Date());
    switch (period) {
      case "yesterday": return { periodStart: subDays(now, 1), periodEnd: endOfDay(subDays(now, 1)) };
      case "week": return { periodStart: startOfWeek(now, { weekStartsOn: 1 }), periodEnd: endOfDay(now) };
      case "month": return { periodStart: startOfMonth(now), periodEnd: endOfDay(now) };
      case "custom": return {
        periodStart: customStart ? startOfDay(customStart) : now,
        periodEnd: customEnd ? endOfDay(customEnd) : endOfDay(now),
      };
      default: return { periodStart: now, periodEnd: endOfDay(now) };
    }
  }, [period, customStart, customEnd]);

  const periodStartISO = periodStart.toISOString();
  const periodEndISO = periodEnd.toISOString();

  // Filtered tasks by department/employee
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedDepartment) result = result.filter(t => t.department_id === selectedDepartment);
    if (selectedEmployee) result = result.filter(t => t.assigned_to === selectedEmployee);
    return result;
  }, [tasks, selectedDepartment, selectedEmployee]);

  // Period-scoped tasks
  const periodTasks = useMemo(() => {
    return filteredTasks.filter(t => {
      const dueDay = t.due_date;
      const startDay = t.start_date;
      if (dueDay && dueDay >= periodStartISO && dueDay <= periodEndISO) return true;
      if (startDay && startDay >= periodStartISO && startDay <= periodEndISO) return true;
      return false;
    });
  }, [filteredTasks, periodStartISO, periodEndISO]);

  // Overdue tasks WITHIN the period (fixed bug)
  const overdueTasks = useMemo(() => {
    return periodTasks.filter(t =>
      t.status !== "completed" &&
      t.due_date &&
      t.due_date < periodEndISO &&
      t.due_date >= periodStartISO
    );
  }, [periodTasks, periodStartISO, periodEndISO]);

  // Period delays
  const periodDelays = useMemo(() => {
    return delays.filter(d =>
      d.created_at >= periodStartISO && d.created_at <= periodEndISO
    );
  }, [delays, periodStartISO, periodEndISO]);

  // Employee options
  const employeeOptions = useMemo(() => {
    let list = profilesList;
    if (selectedDepartment) list = list.filter(p => p.department_id === selectedDepartment);
    return list.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [profilesList, selectedDepartment]);

  // KPI calculations
  const activeSectors = useMemo(() => {
    const sectorIds = new Set(periodTasks.map(t => t.department_id).filter(Boolean));
    return sectorIds.size;
  }, [periodTasks]);

  const avgDelayRate = useMemo(() => {
    const total = periodTasks.length;
    if (total === 0) return 0;
    return (overdueTasks.length / total) * 100;
  }, [periodTasks, overdueTasks]);

  const getName = (id: string | null) => (id ? profiles.get(id) || "—" : "Não atribuída");

  const handleOverviewCardClick = (filter: OverviewFilter) => {
    setOverviewFilter(prev => prev === filter ? null : filter);
    setActiveTab("geral");
  };

  const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada", not_done: "Não Feita" };
  const statusColors: Record<string, string> = { pending: "bg-muted text-muted-foreground", in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", overdue: "bg-destructive/10 text-destructive", not_done: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };
  const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };

  const drillDownTasks = useMemo(() => {
    if (!overviewFilter) return [];
    const cutoffISO = periodEndISO;
    const lateStartIds = new Set(periodDelays.filter(d => d.log_type === "inicio_atrasado").map(d => d.task_id));
    const lateCompletionIds = new Set(periodDelays.filter(d => d.log_type === "conclusao_atrasada").map(d => d.task_id));

    switch (overviewFilter) {
      case "total": return periodTasks;
      case "onTime": return periodTasks.filter(t => t.status === "completed" && !lateStartIds.has(t.id) && !lateCompletionIds.has(t.id));
      case "lateStart": return periodTasks.filter(t => lateStartIds.has(t.id));
      case "lateCompletion": return periodTasks.filter(t => lateCompletionIds.has(t.id));
      case "notCompleted": return periodTasks.filter(t => t.status !== "completed" && t.due_date && t.due_date < cutoffISO);
      default: return [];
    }
  }, [overviewFilter, periodTasks, periodDelays]);

  // Filtered dropdowns
  const filteredDepts = departments.filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()));
  const filteredEmps = employeeOptions.filter(p => (p.full_name || "").toLowerCase().includes(empSearch.toLowerCase()));

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral da Empresa</h1>
          <p className="text-sm text-muted-foreground">
            {period === "custom" && customStart && customEnd
              ? `${format(customStart, "dd/MM/yyyy")} — ${format(customEnd, "dd/MM/yyyy")}`
              : format(periodStart, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <AdminPeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* Custom date pickers */}
      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !customStart && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStart ? format(customStart, "dd/MM/yyyy") : "Data Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !customEnd && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEnd ? format(customEnd, "dd/MM/yyyy") : "Data Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} disabled={(date) => customStart ? date < customStart : false} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedDepartment || "all"} onValueChange={v => { setSelectedDepartment(v === "all" ? null : v); setSelectedEmployee(null); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os Setores" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 pb-2">
              <div className="flex items-center gap-2 border rounded-md px-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar setor..." value={deptSearch} onChange={e => setDeptSearch(e.target.value)} className="border-0 h-8 px-0 focus-visible:ring-0" />
              </div>
            </div>
            <SelectItem value="all">Todos os Setores</SelectItem>
            {filteredDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedEmployee || "all"} onValueChange={v => setSelectedEmployee(v === "all" ? null : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os Usuários" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 pb-2">
              <div className="flex items-center gap-2 border rounded-md px-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar usuário..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="border-0 h-8 px-0 focus-visible:ring-0" />
              </div>
            </div>
            <SelectItem value="all">Todos os Usuários</SelectItem>
            {filteredEmps.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>)}
          </SelectContent>
        </Select>

        {(selectedDepartment || selectedEmployee) && (
          <div className="flex gap-2">
            {selectedDepartment && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {departments.find(d => d.id === selectedDepartment)?.name}
                <button onClick={() => { setSelectedDepartment(null); setSelectedEmployee(null); }} className="ml-1 hover:bg-muted rounded-full p-0.5"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {selectedEmployee && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {profiles.get(selectedEmployee) || "Usuário"}
                <button onClick={() => setSelectedEmployee(null)} className="ml-1 hover:bg-muted rounded-full p-0.5"><X className="h-3 w-3" /></button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* KPIs */}
      <AdminKpiCards
        activeSectors={activeSectors}
        totalTasks={periodTasks.length}
        overdueTasks={overdueTasks.length}
        avgDelayRate={avgDelayRate}
      />

      {/* Overview Cards */}
      <AdminOverviewCards
        periodTasks={periodTasks}
        periodDelays={periodDelays}
        today={new Date()}
        onCardClick={handleOverviewCardClick}
        activeFilter={overviewFilter}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="geral" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="setores" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Setores
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="atrasos" className="gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Atrasos
            {overdueTasks.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[11px]">{overdueTasks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          {overviewFilter && drillDownTasks.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                   <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownTasks.map(task => (
                    <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleTaskClick(task)}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{getName(task.assigned_to)}</TableCell>
                      <TableCell className="text-sm">{formatStoredDate(task.start_date, "datetime")}</TableCell>
                      <TableCell className="text-sm">{formatStoredDate(task.due_date, "datetime")}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", statusColors[task.status])} variant="outline">
                          {statusLabels[task.status] || task.status}
                        </Badge>
                      </TableCell>
                      
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : overviewFilter ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma tarefa encontrada para este filtro.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Clique em um dos cards acima para ver as tarefas detalhadas.
            </p>
          )}
        </TabsContent>

        <TabsContent value="setores" className="mt-4 space-y-5">
          <SectorComparisonCard tasks={filteredTasks} departments={departments} />
          <AdminSectorCards tasks={filteredTasks} departments={departments} profiles={profilesList} />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <AdminUserRanking
            tasks={tasks}
            timeLogs={timeLogs}
            profiles={profilesList}
            departments={departments}
            period={period}
            selectedDepartment={selectedDepartment}
          />
        </TabsContent>

        <TabsContent value="atrasos" className="mt-4">
          <DelayKpiCards
            tasks={filteredTasks}
            selectedDepartment={selectedDepartment}
            selectedEmployee={selectedEmployee}
            referenceDate={periodEnd}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {activeTab === "analytics" && (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
              <LazyPerformanceAnalytics
                tasks={tasks}
                timeLogs={timeLogs}
                departments={departments}
                selectedDepartment={selectedDepartment}
                profiles={profilesList}
              />
            </Suspense>
          )}
        </TabsContent>
      </Tabs>

      <TaskDetailModal
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        members={profilesList as any}
        departments={departments as any}
        onEdit={() => {}}
        onRefresh={handleRefresh}
      />

      <AIAnalysisDialog departments={departments as any} profiles={profilesList as any} />
    </div>
  );
}
