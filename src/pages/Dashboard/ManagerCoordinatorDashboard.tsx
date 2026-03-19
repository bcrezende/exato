import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { nowAsFakeUTC } from "@/lib/date-utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import KpiCards from "@/components/dashboard/KpiCards";
import DelayKpiCards from "@/components/dashboard/DelayKpiCards";
import TodayProgress from "@/components/dashboard/TodayProgress";
import OverdueSection from "@/components/dashboard/OverdueSection";
import CriticalTasksList from "@/components/dashboard/CriticalTasksList";
import PodiumCard from "@/components/dashboard/PodiumCard";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TeamSummaryCard from "@/components/dashboard/TeamSummaryCard";
import RiskRadar from "@/components/dashboard/RiskRadar";
import SectorComparisonCard from "@/components/dashboard/SectorComparisonCard";
import AIAnalysisDialog from "@/components/dashboard/AIAnalysisDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, Users, BarChart3 } from "lucide-react";

const LazyPerformanceAnalytics = lazy(() => import("@/components/dashboard/PerformanceAnalytics"));

type Task = Tables<"tasks">;
type Profile = { id: string; full_name: string | null; department_id: string | null };

export default function ManagerCoordinatorDashboard() {
  const { user, role, profile } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [timeLogs, setTimeLogs] = useState<{ id: string; task_id: string; user_id: string; action: string; created_at: string }[]>([]);
  const [coordinatorAnalystIds, setCoordinatorAnalystIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("hoje");
  const [viewDate, setViewDate] = useState<"today" | "yesterday">("today");

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
    if (!user || !role || !profile) return;
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
        if (depsRes.status === "fulfilled" && depsRes.value.data) {
          if ((role === "manager" || role === "coordinator") && profile?.department_id) {
            setDepartments(depsRes.value.data.filter(d => d.id === profile.department_id));
            setSelectedDepartment(profile.department_id);
          } else {
            setDepartments(depsRes.value.data);
          }
        }
        if (role === "coordinator" && user) {
          const { data: links } = await supabase
            .from("coordinator_analysts")
            .select("analyst_id")
            .eq("coordinator_id", user.id);
          if (links) setCoordinatorAnalystIds(links.map(l => l.analyst_id));
        }
        if (logsRes.status === "fulfilled" && logsRes.value.data) setTimeLogs(logsRes.value.data);
        if (profilesRes.status === "fulfilled" && profilesRes.value.data) {
          const map = new Map<string, string>();
          profilesRes.value.data.forEach((p: Profile) => map.set(p.id, p.full_name || "Sem nome"));
          setProfiles(map);
          setProfilesList(profilesRes.value.data as Profile[]);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const referenceDate = useMemo(() => {
    const now = startOfDay(new Date());
    return viewDate === "yesterday" ? subDays(now, 1) : now;
  }, [viewDate]);
  const referenceDateStr = format(referenceDate, "yyyy-MM-dd");
  const today = referenceDate;

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedDepartment) result = result.filter((t) => t.department_id === selectedDepartment);
    if (selectedEmployee) result = result.filter((t) => t.assigned_to === selectedEmployee);
    return result;
  }, [tasks, selectedDepartment, selectedEmployee]);

  const employeeOptions = useMemo(() => {
    let list = profilesList;
    if (role === "coordinator") {
      list = list.filter(p => coordinatorAnalystIds.includes(p.id));
    } else if (role === "manager" && profile?.department_id) {
      list = list.filter(p => p.department_id === profile.department_id);
    } else if (selectedDepartment) {
      list = list.filter(p => p.department_id === selectedDepartment);
    }
    return list.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [profilesList, selectedDepartment, role, profile, coordinatorAnalystIds]);

  const { overdueTasks, todayTasks, upcomingTasks } = useMemo(() => {
    const overdue: Task[] = [];
    const todayList: Task[] = [];
    const upcoming: Task[] = [];

    const isYesterday = viewDate === "yesterday";
    const nowFake = nowAsFakeUTC();

    filteredTasks.forEach((t) => {
      const isCompleted = t.status === "completed";
      const dueDay = t.due_date?.split("T")[0];
      const startDay = t.start_date?.split("T")[0];

      if (isYesterday) {
        if (dueDay === referenceDateStr || startDay === referenceDateStr) {
          todayList.push(t);
        } else if (!isCompleted && t.due_date && t.due_date.split("T")[0]! < referenceDateStr) {
          overdue.push(t);
        }
        return;
      }

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

    overdue.sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date).getTime() : 0;
      const db = b.due_date ? new Date(b.due_date).getTime() : 0;
      return da - db;
    });

    return { overdueTasks: overdue, todayTasks: todayList, upcomingTasks: upcoming };
  }, [filteredTasks, referenceDateStr, today, viewDate]);

  const todayCompleted = todayTasks.filter((t) => t.status === "completed").length;
  const todayTotal = todayTasks.length;
  const todayProgress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const getName = (id: string | null) => (id ? profiles.get(id) || "—" : "Não atribuída");

  const departmentName = departments.find(d => d.id === profile?.department_id)?.name;
  const roleLabel = role === "manager"
    ? `Visão do Setor — ${departmentName || "Setor"}`
    : role === "coordinator"
      ? "Visão da Minha Equipe"
      : "Visão geral";

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-5">
      <DashboardHeader
        today={today}
        roleLabel={roleLabel}
        onNavigateMyDay={() => navigate("/my-day")}
        viewDate={viewDate}
        onViewDateChange={setViewDate}
      />

      <DashboardFilters
        departments={departments}
        employeeOptions={employeeOptions}
        selectedDepartment={selectedDepartment}
        selectedEmployee={selectedEmployee}
        onDepartmentChange={setSelectedDepartment}
        onEmployeeChange={setSelectedEmployee}
        role={role}
      />

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

      <RiskRadar
        tasks={filteredTasks}
        timeLogs={timeLogs}
        profiles={profiles}
        departments={departments}
      />

      <DelayKpiCards
        tasks={filteredTasks}
        selectedDepartment={selectedDepartment}
        selectedEmployee={selectedEmployee}
        referenceDate={referenceDate}
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
          today={today}
          onTaskClick={handleTaskClick}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="hoje" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Hoje
            {todayTotal > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">{todayTotal}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="atrasadas" className="gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Atrasadas
            {overdueTasks.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[11px]">{overdueTasks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Todas as Tarefas de Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {todayTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa para hoje</p>
              ) : (
                <div className="space-y-1.5">
                  {[...todayTasks].sort((a, b) => {
                    const order: Record<string, number> = { in_progress: 0, pending: 1, overdue: 2, completed: 3 };
                    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
                  }).map((task) => (
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
                      <span className="text-[11px] text-muted-foreground shrink-0">{getName(task.assigned_to)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atrasadas" className="mt-4">
          <OverdueSection overdueTasks={overdueTasks} getName={getName} today={today} onTaskClick={handleTaskClick} />
        </TabsContent>

        <TabsContent value="equipe" className="mt-4">
          <PodiumCard
            tasks={tasks}
            timeLogs={timeLogs}
            profiles={profilesList}
            departments={departments}
            selectedDepartment={selectedDepartment}
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

      <AIAnalysisDialog
        departments={departments as any}
        profiles={profilesList as any}
      />
    </div>
  );
}
