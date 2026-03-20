import { useEffect, useState, useMemo } from "react";
import { devError } from "@/lib/logger";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UsersRound, ArrowRight, Activity, AlertTriangle, ListTodo } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Task = Tables<"tasks">;

type AnalystData = {
  profile: Profile;
  inProgress: number;
  overdue: number;
  pending: number;
  total: number;
  activity: "active" | "idle" | "inactive";
};

const activityConfig = {
  active: { label: "Ativo", color: "bg-success", dotClass: "bg-success" },
  idle: { label: "Ausente", color: "bg-warning", dotClass: "bg-warning" },
  inactive: { label: "Inativo", color: "bg-muted-foreground/40", dotClass: "bg-muted-foreground/40" },
};

export default function TeamMonitoring() {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysts, setAnalysts] = useState<AnalystData[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user || !profile?.company_id) return;
    fetchData();
  }, [user, profile?.company_id, role]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const companyId = profile!.company_id!;

      // Get analyst user IDs based on role
      let analystIds: string[] = [];

      if (role === "coordinator") {
        const { data: links } = await supabase
          .from("coordinator_analysts")
          .select("analyst_id")
          .eq("coordinator_id", user!.id);
        analystIds = (links || []).map((l) => l.analyst_id);
      } else {
        if (role === "manager") {
          // Manager: get analysts in own department
          const { data: roles } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "analyst");
          const roleUserIds = (roles || []).map((r) => r.user_id);

          const { data: companyProfiles } = await supabase
            .from("profiles")
            .select("id, department_id")
            .eq("company_id", companyId)
            .in("id", roleUserIds);

          analystIds = (companyProfiles || [])
            .filter((p) => p.department_id === profile!.department_id)
            .map((p) => p.id);
        } else {
          // Admin: get ALL company members (except self)
          const { data: companyProfiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("company_id", companyId)
            .neq("id", user!.id);

          analystIds = (companyProfiles || []).map((p) => p.id);
        }
      }

      if (analystIds.length === 0) {
        setAnalysts([]);
        setLoading(false);
        return;
      }

      // Fetch profiles and tasks in parallel
      const [profilesRes, tasksRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, department_id, position").in("id", analystIds),
        supabase
          .from("tasks")
          .select("id, status, assigned_to")
          .eq("company_id", companyId)
          .in("assigned_to", analystIds)
          .in("status", ["pending", "in_progress", "overdue"]),
      ]);

      const profiles = profilesRes.data || [];
      const tasks = tasksRes.data || [];

      const now = new Date();

      const result: AnalystData[] = profiles.map((p) => {
        const userTasks = tasks.filter((t) => t.assigned_to === p.id);
        const inProgress = userTasks.filter((t) => t.status === "in_progress").length;
        const overdue = userTasks.filter((t) => t.status === "overdue").length;
        const pending = userTasks.filter((t) => t.status === "pending").length;
        const total = userTasks.length;

        let activity: "active" | "idle" | "inactive" = "inactive";
        if (inProgress > 0) activity = "active";
        else if (pending > 0 || overdue > 0) activity = "idle";

        return { profile: p, inProgress, overdue, pending, total, activity };
      });

      // Sort: active first, then idle, then inactive
      result.sort((a, b) => {
        const order = { active: 0, idle: 1, inactive: 2 };
        return order[a.activity] - order[b.activity];
      });

      setAnalysts(result);
    } catch (err) {
      devError("Error fetching team data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = analysts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.profile.full_name?.toLowerCase().includes(q));
    }
    if (filter === "active") list = list.filter((a) => a.activity === "active");
    if (filter === "delayed") list = list.filter((a) => a.overdue > 0);
    if (filter === "overloaded") list = list.filter((a) => a.total >= 5);
    return list;
  }, [analysts, search, filter]);

  const getInitials = (name: string | null) =>
    name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UsersRound className="h-6 w-6 text-primary" />
          Minha Equipe
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {analysts.length} analista{analysts.length !== 1 ? "s" : ""} vinculado{analysts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="delayed">Com atraso</SelectItem>
            <SelectItem value="overloaded">Sobrecarregados (5+)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UsersRound className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum analista encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const cfg = activityConfig[a.activity];
            return (
              <Card
                key={a.profile.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/team/monitoring/${a.profile.id}`)}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getInitials(a.profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${cfg.dotClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{a.profile.full_name}</p>
                      <p className="text-xs text-muted-foreground">{cfg.label}</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">Em execução</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{a.inProgress}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-muted-foreground">Atrasadas</span>
                      <Badge variant={a.overdue > 0 ? "destructive" : "secondary"} className="ml-auto text-xs">{a.overdue}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <ListTodo className="h-3.5 w-3.5 text-warning" />
                      <span className="text-muted-foreground">Pendentes</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{a.pending}</Badge>
                    </div>
                  </div>

                  {/* Action */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-primary group-hover:bg-primary/5"
                  >
                    Ver Detalhes
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
