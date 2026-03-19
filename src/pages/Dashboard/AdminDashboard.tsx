import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { devError } from "@/lib/logger";
import { nowAsFakeUTC } from "@/lib/date-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfDay, startOfWeek, startOfMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import AdminPeriodToggle, { type AdminPeriod } from "@/components/dashboard/admin/AdminPeriodToggle";
import AdminKpiCards from "@/components/dashboard/admin/AdminKpiCards";
import AdminSectorCards from "@/components/dashboard/admin/AdminSectorCards";
import AdminUserRanking from "@/components/dashboard/admin/AdminUserRanking";
import KpiCards from "@/components/dashboard/KpiCards";
import DelayKpiCards from "@/components/dashboard/DelayKpiCards";
import TodayProgress from "@/components/dashboard/TodayProgress";
import CriticalTasksList from "@/components/dashboard/CriticalTasksList";
import TeamSummaryCard from "@/components/dashboard/TeamSummaryCard";
import RiskRadar from "@/components/dashboard/RiskRadar";
import SectorComparisonCard from "@/components/dashboard/SectorComparisonCard";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import AIAnalysisDialog from "@/components/dashboard/AIAnalysisDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, BarChart3, Users, AlertCircle, LayoutDashboard, Clock, X, Search } from "lucide-react";

const LazyPerformanceAnalytics = lazy(() => import("@/components/dashboard/PerformanceAnalytics"));

type Task = Tables<"tasks">;
type Profile = { id: string; full_name: string | null; department_id: string | null };

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [timeLogs, setTimeLogs] = useState<{ id: string; task_id: string; user_id: string; action: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [period, setPeriod] = useState<AdminPeriod>("today");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [deptSearch, setDeptSearch] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [activeTab, setActiveTab] = useState("geral");

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleRefresh = () => {
    supabase.from("tasks").select("*").order("due_date", { ascending: true }).then(({ data }) => {
      if (data) setTasks(data);
    });
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          supabase.from("tasks").select("id,title,description,status,priority,due_date,start_date,assigned_to,created_by,department_id,company_id,recurrence_type,recurrence_parent_id,estimated_minutes,difficulty_rating,created_at,updated_at").order("due_date", { ascending: true }),
          supabase.from("profiles").select("id, full_name, department_id"),
          supabase.from("departments").select("id, name").order("name"),
          supabase.from("task_time_logs").select("id, task_id, user_id, action, created_at").order("created_at", { ascending: true }),
        ]);
        const [tasksRes, profilesRes, depsRes, logsRes] = results;
        if (tasksRes.status === "fulfilled" && tasksRes.value.data) setTasks(tasksRes.value.data);
        if (depsRes.status === "fulfilled" && depsRes.value.data) setDepartments(depsRes.value.data);
        if (logsRes.status === "fulfilled" && logsRes.value.data) setTimeLogs(logsRes.value.data);
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

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedDepartment) result = result.filter(t => t.department_id === selectedDepartment);
    if (selectedEmployee) result = result.filter(t => t.assigned_to === selectedEmployee);
    return result;
  }, [tasks, selectedDepartment, selectedEmployee]);

  // Period-scoped tasks
  const periodTasks = useMemo(() => {
    const startStr = format(periodStart, "yyyy-MM-dd");
    const endStr = format(referenceDate, "yyyy-MM-dd");
    return filteredTasks.filter(t => {
      const dueDay = t.due_date?.split("T")[0];
      const startDay = t.start_date?.split("T")[0];
      if (dueDay && dueDay >= startStr && dueDay <= endStr) return true;
      if (startDay && startDay >= startStr && startDay <= endStr) return true;
      // Include in_progress and overdue
      if (t.status === "in_progress" || t.status === "overdue") return true;
      return false;
    });
  }, [filteredTasks, periodStart, referenceDate]);

  // Overdue/today/upcoming
  const { overdueTasks, todayTasks, upcomingTasks } = useMemo(() => {
    const overdue: Task[] = [];
    const todayList: Task[] = [];
    const upcoming: Task[] = [];
    const nowFake = nowAsFakeUTC();
    const today = referenceDate;

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
        const uStr = format(addDays(today, i), "yyyy-MM-dd");
        if (dueDay === uStr || startDay === uStr) { upcoming.push(t); break; }
      }
    });

    overdue.sort((a, b) => (a.due_date ? new Date(a.due_date).getTime() : 0) - (b.due_date ? new Date(b.due_date).getTime() : 0));
    return { overdueTasks: overdue, todayTasks: todayList, upcomingTasks: upcoming };
  }, [filteredTasks, referenceDateStr, referenceDate]);

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
    const overdue = periodTasks.filter(t => t.status === "overdue" || (t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date())).length;
    return (overdue / total) * 100;
  }, [periodTasks]);

  const todayCompleted = todayTasks.filter(t => t.status === "completed").length;
  const todayTotal = todayTasks.length;
  const todayProgress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
  const getName = (id: string | null) => (id ? profiles.get(id) || "—" : "Não atribuída");

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
            {format(referenceDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <AdminPeriodToggle value={period} onChange={setPeriod} />
      </div>

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
                <Input
                  placeholder="Buscar setor..."
                  value={deptSearch}
                  onChange={e => setDeptSearch(e.target.value)}
                  className="border-0 h-8 px-0 focus-visible:ring-0"
                />
              </div>
            </div>
            <SelectItem value="all">Todos os Setores</SelectItem>
            {filteredDepts.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
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
                <Input
                  placeholder="Buscar usuário..."
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  className="border-0 h-8 px-0 focus-visible:ring-0"
                />
              </div>
            </div>
            <SelectItem value="all">Todos os Usuários</SelectItem>
            {filteredEmps.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active filter chips */}
        {(selectedDepartment || selectedEmployee) && (
          <div className="flex gap-2">
            {selectedDepartment && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {departments.find(d => d.id === selectedDepartment)?.name}
                <button onClick={() => { setSelectedDepartment(null); setSelectedEmployee(null); }} className="ml-1 hover:bg-muted rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedEmployee && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {profiles.get(selectedEmployee) || "Usuário"}
                <button onClick={() => setSelectedEmployee(null)} className="ml-1 hover:bg-muted rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
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

        <TabsContent value="geral" className="mt-4 space-y-5">
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
