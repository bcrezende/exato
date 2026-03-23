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
import DelayKpiCards from "@/components/dashboard/DelayKpiCards";
import TodayProgress from "@/components/dashboard/TodayProgress";
import CriticalTasksList from "@/components/dashboard/CriticalTasksList";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TaskForm from "@/components/tasks/TaskForm";
import AIAnalysisDialog from "@/components/dashboard/AIAnalysisDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, AlertCircle, BarChart3, UserCheck, X, Eye,
  ClipboardList, CircleDot, Clock, CheckCircle2, ListTodo
} from "lucide-react";

const LazyPerformanceAnalytics = lazy(() => import("@/components/dashboard/PerformanceAnalytics"));

type Task = Tables<"tasks">;
type Profile = { id: string; full_name: string | null; department_id: string | null };
type DelayRecord = { id: string; task_id: string; user_id: string; log_type: string; created_at: string };

type AnalystData = {
  id: string;
  name: string;
  activity: "active" | "idle" | "inactive";
  inProgress: number;
  overdue: number;
  pending: number;
  completed: number;
};

const activityConfig = {
  active: { label: "Ativo", color: "bg-green-500" },
  idle: { label: "Ausente", color: "bg-yellow-500" },
  inactive: { label: "Inativo", color: "bg-muted-foreground/40" },
};

export default function CoordinatorDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [timeLogs, setTimeLogs] = useState<{ id: string; task_id: string; user_id: string; action: string; created_at: string }[]>([]);
  const [analystIds, setAnalystIds] = useState<string[]>([]);
  const [delays, setDelays] = useState<DelayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [overviewFilter, setOverviewFilter] = useState<OverviewFilter | null>(null);

  const [period, setPeriod] = useState<AdminPeriod>("today");
  const [selectedAnalyst, setSelectedAnalyst] = useState<string | null>(null);
  const [includeMyTasks, setIncludeMyTasks] = useState(true);
  const [activeTab, setActiveTab] = useState("geral");

  const handleTaskClick = (task: Task) => { setSelectedTask(task); setDetailOpen(true); };
  const TASK_COLS = "id,title,status,priority,due_date,start_date,assigned_to,department_id,recurrence_type,estimated_minutes,created_by,created_at,recurrence_parent_id,justification,difficulty_rating,updated_at,description,company_id" as const;

  const handleRefresh = () => {
    supabase.from("tasks").select(TASK_COLS).order("due_date", { ascending: true }).then(({ data }) => { if (data) setTasks(data as unknown as Task[]); });
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const { data: links } = await supabase
          .from("coordinator_analysts")
          .select("analyst_id")
          .eq("coordinator_id", user.id);

        const myAnalystIds = links?.map(l => l.analyst_id) || [];
        setAnalystIds(myAnalystIds);

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
        devError("Coordinator dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const analystProfiles = useMemo(() => {
    return profilesList
      .filter(p => analystIds.includes(p.id))
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [profilesList, analystIds]);

  const relevantIds = useMemo(() => {
    const ids = new Set(analystIds);
    if (includeMyTasks && user) ids.add(user.id);
    return ids;
  }, [analystIds, includeMyTasks, user]);

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

  const teamTasks = useMemo(() => {
    return tasks.filter(t => t.assigned_to && relevantIds.has(t.assigned_to));
  }, [tasks, relevantIds]);

  const filteredTasks = useMemo(() => {
    if (!selectedAnalyst) return teamTasks;
    return teamTasks.filter(t => t.assigned_to === selectedAnalyst);
  }, [teamTasks, selectedAnalyst]);

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
      const isOverdue = !isInProgress && (t.status === "overdue" || (!isCompleted && t.due_date && t.due_date < nowFake));

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

  const todayCompleted = todayTasks.filter(t => t.status === "completed").length;
  const todayTotal = todayTasks.length;
  const todayProgress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
  const getName = (id: string | null) => (id ? profiles.get(id) || "—" : "Não atribuída");

  const myTasks = useMemo(() => tasks.filter(t => t.assigned_to === user?.id), [tasks, user?.id]);
  const myCompleted = myTasks.filter(t => t.status === "completed").length;
  const myInProgress = myTasks.filter(t => t.status === "in_progress").length;
  const myOverdue = myTasks.filter(t => t.status === "overdue" || (t.status !== "completed" && t.due_date && t.due_date < nowAsFakeUTC())).length;
  const myProgress = myTasks.length > 0 ? Math.round((myCompleted / myTasks.length) * 100) : 0;

  const teamProductivity = useMemo(() => {
    const total = periodTasks.length;
    if (total === 0) return 100;
    const overdue = periodTasks.filter(t => t.status === "overdue" || (t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date())).length;
    return Math.round(((total - overdue) / total) * 100);
  }, [periodTasks]);

  const analystData: AnalystData[] = useMemo(() => {
    return analystProfiles.map(p => {
      const pTasks = tasks.filter(t => t.assigned_to === p.id);
      const inProgress = pTasks.filter(t => t.status === "in_progress").length;
      const overdue = pTasks.filter(t => t.status === "overdue" || (t.status !== "completed" && t.due_date && t.due_date < nowAsFakeUTC())).length;
      const pending = pTasks.filter(t => t.status === "pending").length;
      const completed = pTasks.filter(t => t.status === "completed").length;
      const activity: "active" | "idle" | "inactive" = inProgress > 0 ? "active" : (pending > 0 || overdue > 0) ? "idle" : "inactive";
      return { id: p.id, name: p.full_name || "Sem nome", activity, inProgress, overdue, pending, completed };
    }).sort((a, b) => {
      const order = { active: 0, idle: 1, inactive: 2 };
      return order[a.activity] - order[b.activity];
    });
  }, [analystProfiles, tasks]);

  const getInitials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

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
      case "notCompleted": return periodTasks.filter(t => t.status !== "completed" && t.status !== "in_progress" && t.due_date && t.due_date < cutoffISO);
      default: return [];
    }
  }, [overviewFilter, periodTasks, periodDelays, periodEndISO]);

  if (loading) return <DashboardSkeleton />;

  const AnalystCardsGrid = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {analystData.length === 0 ? (
        <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhum analista vinculado</p>
      ) : analystData.map(a => {
        const cfg = activityConfig[a.activity];
        return (
          <Card key={a.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs font-medium">{getInitials(a.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`h-2 w-2 rounded-full ${cfg.color}`} />
                    <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-md py-1.5">
                  <p className="text-lg font-semibold text-primary">{a.inProgress}</p>
                  <p className="text-[10px] text-muted-foreground">Em execução</p>
                </div>
                <div className="bg-muted/50 rounded-md py-1.5">
                  <p className={`text-lg font-semibold ${a.overdue > 0 ? "text-destructive" : ""}`}>{a.overdue}</p>
                  <p className="text-[10px] text-muted-foreground">Atrasadas</p>
                </div>
                <div className="bg-muted/50 rounded-md py-1.5">
                  <p className="text-lg font-semibold">{a.pending}</p>
                  <p className="text-[10px] text-muted-foreground">Pendentes</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => navigate(`/team/monitoring/${a.id}`)}
              >
                <Eye className="h-3.5 w-3.5" />
                Ver Detalhes
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const MyPerformanceCard = () => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Minha Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Suas tarefas: {myTasks.length}</span>
          <span className="font-semibold">{myProgress}% concluídas</span>
        </div>
        <Progress value={myProgress} className="h-2.5" />
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span>{myCompleted} concluídas</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CircleDot className="h-3.5 w-3.5 text-primary" />
            <span>{myInProgress} em andamento</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-destructive" />
            <span>{myOverdue} atrasadas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MyTasksList = () => {
    const sorted = [...myTasks].sort((a, b) => {
      const order: Record<string, number> = { in_progress: 0, overdue: 1, pending: 2, completed: 3 };
      return (order[a.status] ?? 4) - (order[b.status] ?? 4);
    });
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Minhas Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa atribuída a você</p>
          ) : (
            <div className="space-y-1.5">
              {sorted.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    task.status === "completed" ? "bg-green-500" :
                    task.status === "in_progress" ? "bg-primary" :
                    task.status === "overdue" ? "bg-destructive" : "bg-muted-foreground"
                  }`} />
                  <span className="text-sm font-medium truncate flex-1">{task.title}</span>
                  <Badge variant={task.priority === "high" ? "destructive" : "secondary"} className="text-[10px] h-5">
                    {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                  </Badge>
                  {task.due_date && (
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {format(new Date(task.due_date), "dd/MM")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const productivityColor = teamProductivity >= 90
    ? "text-green-600 dark:text-green-400"
    : teamProductivity >= 75
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-destructive";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão da Minha Equipe</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.full_name} — {format(referenceDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {analystIds.length} analistas
          </Badge>
          <AdminPeriodToggle value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedAnalyst || "all"} onValueChange={v => setSelectedAnalyst(v === "all" ? null : v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos os Analistas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Analistas</SelectItem>
            {analystProfiles.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={includeMyTasks} onCheckedChange={(v) => setIncludeMyTasks(!!v)} />
          Incluir minhas tarefas
        </label>

        {selectedAnalyst && (
          <Badge variant="secondary" className="gap-1 pr-1">
            {profiles.get(selectedAnalyst) || "Analista"}
            <button onClick={() => setSelectedAnalyst(null)} className="ml-1 hover:bg-muted rounded-full p-0.5">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tarefas da Equipe", value: periodTasks.length, icon: LayoutDashboard },
          { label: "Minhas Tarefas", value: myTasks.length, icon: ClipboardList },
          { label: "Atrasadas", value: overdueTasks.length, icon: AlertCircle, destructive: overdueTasks.length > 0 },
          { label: "Produtividade", value: `${teamProductivity}%`, icon: UserCheck, isProductivity: true },
        ].map((kpi, i) => {
          let colorClass = "";
          if (kpi.destructive) colorClass = "text-destructive";
          if (kpi.isProductivity) colorClass = productivityColor;
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
          <TabsTrigger value="analistas" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Meus Analistas
            {analystIds.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">{analystIds.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="minhas" className="gap-1.5">
            <ListTodo className="h-3.5 w-3.5" />
            Minhas Tarefas
            {myTasks.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">{myTasks.length}</Badge>}
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

          <div>
            <h2 className="text-base font-semibold mb-3">Seus Analistas</h2>
            <AnalystCardsGrid />
          </div>

          <MyPerformanceCard />

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

        <TabsContent value="analistas" className="mt-4">
          <AnalystCardsGrid />
        </TabsContent>

        <TabsContent value="minhas" className="mt-4">
          <MyTasksList />
        </TabsContent>

        <TabsContent value="atrasos" className="mt-4">
          <DelayKpiCards
            tasks={filteredTasks}
            selectedDepartment={profile?.department_id || null}
            selectedEmployee={selectedAnalyst}
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
                selectedDepartment={profile?.department_id || null}
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

      <AIAnalysisDialog
        departments={departments as any}
        profiles={profilesList as any}
      />
    </div>
  );
}
