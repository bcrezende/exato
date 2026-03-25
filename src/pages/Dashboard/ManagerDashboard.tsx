import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { devError } from "@/lib/logger";
import { nowAsFakeUTC, formatStoredDate } from "@/lib/date-utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfDay, startOfWeek, startOfMonth, addDays, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import AdminPeriodToggle, { type AdminPeriod } from "@/components/dashboard/admin/AdminPeriodToggle";
import AdminOverviewCards, { type OverviewFilter } from "@/components/dashboard/admin/AdminOverviewCards";
import KpiCards from "@/components/dashboard/KpiCards";
import DelayKpiCards from "@/components/dashboard/DelayKpiCards";
import TodayProgress from "@/components/dashboard/TodayProgress";
import CriticalTasksList from "@/components/dashboard/CriticalTasksList";
import TeamSummaryCard from "@/components/dashboard/TeamSummaryCard";
import RiskRadar from "@/components/dashboard/RiskRadar";
import CoordinatorCards from "@/components/dashboard/manager/CoordinatorCards";
import AnalystRankingTable from "@/components/dashboard/manager/AnalystRankingTable";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TaskForm from "@/components/tasks/TaskForm";
import AIAnalysisDialog from "@/components/dashboard/AIAnalysisDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, AlertCircle, BarChart3, UserCheck, Search, X, Building2 } from "lucide-react";

const LazyPerformanceAnalytics = lazy(() => import("@/components/dashboard/PerformanceAnalytics"));

type Task = Tables<"tasks">;
type Profile = { id: string; full_name: string | null; department_id: string | null };
type DelayRecord = { id: string; task_id: string; user_id: string; log_type: string; created_at: string };

export default function ManagerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const departmentId = profile?.department_id || null;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [timeLogs, setTimeLogs] = useState<{ id: string; task_id: string; user_id: string; action: string; created_at: string }[]>([]);
  const [coordinatorLinks, setCoordinatorLinks] = useState<{ coordinator_id: string; analyst_id: string }[]>([]);
  const [coordinatorIds, setCoordinatorIds] = useState<string[]>([]);
  const [delays, setDelays] = useState<DelayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [overviewFilter, setOverviewFilter] = useState<OverviewFilter | null>(null);

  const [period, setPeriod] = useState<AdminPeriod>("today");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [empSearch, setEmpSearch] = useState("");
  const [activeTab, setActiveTab] = useState("geral");

  const handleTaskClick = (task: Task) => { setSelectedTask(task); setDetailOpen(true); };
  const TASK_COLS = "id,title,status,priority,due_date,start_date,assigned_to,department_id,recurrence_type,estimated_minutes,created_by,created_at,recurrence_parent_id,justification,difficulty_rating,updated_at,description,company_id" as const;

  const handleRefresh = () => {
    supabase.from("tasks").select(TASK_COLS).eq("department_id", departmentId!).order("due_date", { ascending: true }).then(({ data }) => { if (data) setTasks(data as unknown as Task[]); });
  };

  useEffect(() => {
    if (!user || !departmentId) return;
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          supabase.from("tasks").select(TASK_COLS).eq("department_id", departmentId).order("due_date", { ascending: true }),
          supabase.from("profiles").select("id, full_name, department_id").eq("department_id", departmentId),
          supabase.from("departments").select("id, name").order("name"),
          supabase.from("task_time_logs").select("id, task_id, user_id, action, created_at").order("created_at", { ascending: true }).gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from("coordinator_analysts").select("coordinator_id, analyst_id"),
          supabase.from("user_roles").select("user_id, role").eq("role", "coordinator"),
          supabase.from("task_delays").select("id, task_id, user_id, log_type, created_at").order("created_at", { ascending: true }),
        ]);

        const [tasksRes, profilesRes, depsRes, logsRes, linksRes, rolesRes, delaysRes] = results;

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

        if (linksRes.status === "fulfilled" && linksRes.value.data) {
          setCoordinatorLinks(linksRes.value.data);
        }

        if (rolesRes.status === "fulfilled" && rolesRes.value.data && profilesRes.status === "fulfilled" && profilesRes.value.data) {
          const deptProfileIds = new Set((profilesRes.value.data as Profile[]).map(p => p.id));
          const coordIds = rolesRes.value.data
            .filter(r => deptProfileIds.has(r.user_id))
            .map(r => r.user_id);
          setCoordinatorIds(coordIds);
        }
      } catch (err) {
        devError("Manager dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id, departmentId]);

  // Period date range
  const { referenceDate, periodStart } = useMemo(() => {
    const now = startOfDay(new Date());
    switch (period) {
      case "yesterday": return { referenceDate: subDays(now, 1), periodStart: subDays(now, 1) };
      case "week": return { referenceDate: now, periodStart: startOfWeek(now, { weekStartsOn: 1 }) };
      case "month": return { referenceDate: now, periodStart: startOfMonth(now) };
      default: return { referenceDate: now, periodStart: now };
    }
  }, [period]);

  const referenceDateStr = format(referenceDate, "yyyy-MM-dd");
  const periodEndISO = endOfDay(referenceDate).toISOString();
  const periodStartISO = periodStart.toISOString();

  const filteredTasks = useMemo(() => {
    if (!selectedEmployee) return tasks;
    return tasks.filter(t => t.assigned_to === selectedEmployee);
  }, [tasks, selectedEmployee]);

  const periodTasks = useMemo(() => {
    const startStr = format(periodStart, "yyyy-MM-dd");
    const endStr = format(referenceDate, "yyyy-MM-dd");
    return filteredTasks.filter(t => {
      const dueDay = t.due_date?.split("T")[0];
      const startDay = t.start_date?.split("T")[0];
      if (dueDay && dueDay >= startStr && dueDay <= endStr) return true;
      if (startDay && startDay >= startStr && startDay <= endStr) return true;
      if (t.status === "in_progress" || t.status === "overdue") return true;
      return false;
    });
  }, [filteredTasks, periodStart, referenceDate]);

  const periodDelays = useMemo(() => {
    return delays.filter(d =>
      d.created_at >= periodStartISO && d.created_at <= periodEndISO
    );
  }, [delays, periodStartISO, periodEndISO]);

  const { overdueTasks, todayTasks, upcomingTasks } = useMemo(() => {
    const overdue: Task[] = [];
    const todayList: Task[] = [];
    const upcoming: Task[] = [];
    const nowFake = nowAsFakeUTC();

    filteredTasks.forEach(t => {
      const isCompleted = t.status === "completed";
      const dueDay = t.due_date?.split("T")[0];
      const startDay = t.start_date?.split("T")[0];
      const isInProgress = t.status === "in_progress";
      const isOverdue = !isInProgress && (t.status === "overdue" || (!isCompleted && t.due_date && t.due_date.split("T")[0] < referenceDateStr));

      if (isOverdue && !isCompleted) { overdue.push(t); return; }
      if (isInProgress) { todayList.push(t); return; }
      if (dueDay === referenceDateStr || startDay === referenceDateStr) { todayList.push(t); return; }
      for (let i = 1; i <= 3; i++) {
        const uStr = format(addDays(referenceDate, i), "yyyy-MM-dd");
        if (dueDay === uStr || startDay === uStr) { upcoming.push(t); break; }
      }
    });

    overdue.sort((a, b) => (a.due_date ? new Date(a.due_date).getTime() : 0) - (b.due_date ? new Date(b.due_date).getTime() : 0));
    return { overdueTasks: overdue, todayTasks: todayList, upcomingTasks: upcoming };
  }, [filteredTasks, referenceDateStr, referenceDate]);

  const employeeOptions = useMemo(() => {
    return [...profilesList].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [profilesList]);

  const filteredEmps = employeeOptions.filter(p => (p.full_name || "").toLowerCase().includes(empSearch.toLowerCase()));

  const todayCompleted = todayTasks.filter(t => t.status === "completed").length;
  const todayTotal = todayTasks.length;
  const todayProgress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
  const getName = (id: string | null) => (id ? profiles.get(id) || "—" : "Não atribuída");

  const departmentName = departments.find(d => d.id === departmentId)?.name || "Setor";

  const sectorProductivity = useMemo(() => {
    const total = periodTasks.length;
    if (total === 0) return 100;
    const overdue = periodTasks.filter(t => t.status === "overdue" || (t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date())).length;
    return Math.round(((total - overdue) / total) * 100);
  }, [periodTasks]);

  const inProgressCount = periodTasks.filter(t => t.status === "in_progress").length;

  const handleOverviewCardClick = (filter: OverviewFilter) => {
    setOverviewFilter(prev => prev === filter ? null : filter);
    setActiveTab("geral");
  };

  const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada", not_done: "Não Feita" };
  const statusColors: Record<string, string> = { pending: "bg-muted text-muted-foreground", in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", overdue: "bg-destructive/10 text-destructive", not_done: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };

  const drillDownTasks = useMemo(() => {
    if (!overviewFilter) return [];
    const cutoffISO = periodEndISO;
    const lateStartIds = new Set(periodDelays.filter(d => d.log_type === "inicio_atrasado").map(d => d.task_id));
    const lateCompletionIds = new Set(periodDelays.filter(d => d.log_type === "conclusao_atrasada").map(d => d.task_id));

    switch (overviewFilter) {
      case "total": return periodTasks;
      case "onTime": return periodTasks.filter(t => t.status === "completed" && !lateStartIds.has(t.id) && !lateCompletionIds.has(t.id));
      case "inProgress": return periodTasks.filter(t => t.status === "in_progress");
      case "lateStart": return periodTasks.filter(t => lateStartIds.has(t.id));
      case "lateCompletion": return periodTasks.filter(t => lateCompletionIds.has(t.id));
      case "notCompleted": { const cutoff = nowAsFakeUTC() < cutoffISO ? nowAsFakeUTC() : cutoffISO; return periodTasks.filter(t => t.status !== "completed" && t.status !== "in_progress" && t.due_date && t.due_date < cutoff); }
      default: return [];
    }
  }, [overviewFilter, periodTasks, periodDelays, periodEndISO]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão do Setor</h1>
          <p className="text-sm text-muted-foreground">
            <Building2 className="inline h-3.5 w-3.5 mr-1" />
            {departmentName} — {format(referenceDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {profilesList.length} membros
          </Badge>
          <AdminPeriodToggle value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedEmployee || "all"} onValueChange={v => setSelectedEmployee(v === "all" ? null : v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos os Membros" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 pb-2">
              <div className="flex items-center gap-2 border rounded-md px-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar membro..."
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  className="border-0 h-8 px-0 focus-visible:ring-0"
                />
              </div>
            </div>
            <SelectItem value="all">Todos os Membros</SelectItem>
            {filteredEmps.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedEmployee && (
          <Badge variant="secondary" className="gap-1 pr-1">
            {profiles.get(selectedEmployee) || "Membro"}
            <button onClick={() => setSelectedEmployee(null)} className="ml-1 hover:bg-muted rounded-full p-0.5">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tarefas no Período", value: periodTasks.length, icon: LayoutDashboard },
          { label: "Em Andamento", value: inProgressCount, icon: BarChart3 },
          { label: "Atrasadas", value: overdueTasks.length, icon: AlertCircle, destructive: overdueTasks.length > 0 },
          { label: "Produtividade", value: `${sectorProductivity}%`, icon: UserCheck, productivity: true },
        ].map((kpi, i) => {
          let colorClass = "";
          if (kpi.destructive) colorClass = "text-destructive";
          if (kpi.productivity) {
            if (sectorProductivity >= 90) colorClass = "text-green-600 dark:text-green-400";
            else if (sectorProductivity >= 75) colorClass = "text-yellow-600 dark:text-yellow-400";
            else colorClass = "text-destructive";
          }
          return (
            <Card key={i}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{kpi.value}</p>
                  </div>
                  <kpi.icon className="h-5 w-5 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overview Cards */}
      <AdminOverviewCards
        periodTasks={periodTasks}
        periodDelays={periodDelays}
        periodEndISO={periodEndISO}
        nowISO={nowAsFakeUTC()}
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
          <TabsTrigger value="coordenadores" className="gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            Coordenadores
          </TabsTrigger>
          <TabsTrigger value="analistas" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Analistas
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

        <TabsContent value="geral" className="mt-4 space-y-5">
          {/* Drill-down table */}
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
          ) : null}

          <TeamSummaryCard profiles={employeeOptions} todayTasks={todayTasks} />
          <KpiCards
            todayTotal={todayTotal}
            todayInProgress={todayTasks.filter(t => t.status === "in_progress").length}
            todayCompleted={todayCompleted}
            overdueCount={overdueTasks.length}
            todayProgress={todayProgress}
            todayTasks={todayTasks}
            overdueTasks={overdueTasks}
            getName={getName}
            onTaskClick={handleTaskClick}
          />
          <RiskRadar tasks={filteredTasks} timeLogs={timeLogs} profiles={profiles} departments={departments} />

          {coordinatorIds.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-3">Seus Coordenadores</h2>
              <CoordinatorCards
                tasks={filteredTasks}
                profiles={profilesList}
                coordinatorLinks={coordinatorLinks}
                coordinatorIds={coordinatorIds}
              />
            </div>
          )}

          <AnalystRankingTable
            tasks={filteredTasks}
            profiles={profilesList}
            coordinatorLinks={coordinatorLinks}
            departmentId={departmentId}
            limit={5}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <TodayProgress
              tasks={todayTasks}
              todayCompleted={todayCompleted}
              todayTotal={todayTotal}
              todayProgress={todayProgress}
              getName={getName}
              onTaskClick={handleTaskClick}
            />
            <CriticalTasksList
              overdueTasks={overdueTasks}
              todayTasks={todayTasks}
              upcomingTasks={upcomingTasks}
              getName={getName}
              today={referenceDate}
              onTaskClick={handleTaskClick}
            />
          </div>
        </TabsContent>

        <TabsContent value="coordenadores" className="mt-4">
          <CoordinatorCards
            tasks={filteredTasks}
            profiles={profilesList}
            coordinatorLinks={coordinatorLinks}
            coordinatorIds={coordinatorIds}
          />
        </TabsContent>

        <TabsContent value="analistas" className="mt-4">
          <AnalystRankingTable
            tasks={filteredTasks}
            profiles={profilesList}
            coordinatorLinks={coordinatorLinks}
            departmentId={departmentId}
          />
        </TabsContent>

        <TabsContent value="atrasos" className="mt-4">
          <DelayKpiCards
            tasks={filteredTasks}
            selectedDepartment={departmentId}
            selectedEmployee={selectedEmployee}
            referenceDate={referenceDate}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {activeTab === "analytics" && (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
              <LazyPerformanceAnalytics
                tasks={tasks}
                timeLogs={timeLogs}
                departments={departments}
                selectedDepartment={departmentId}
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
        onEdit={(task) => { setDetailOpen(false); setSelectedTask(null); setEditingTask(task); }}
        onRefresh={handleRefresh}
      />

      <TaskForm
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        editing={editingTask}
        members={profilesList as any}
        departments={departments as any}
        onSaved={() => { setEditingTask(null); handleRefresh(); }}
      />

      <AIAnalysisDialog departments={departments as any} profiles={profilesList as any} />
    </div>
  );
}
