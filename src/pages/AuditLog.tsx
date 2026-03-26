import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Activity, LogIn, PlusCircle, RefreshCw, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditStat {
  action: string;
  count: number;
}

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const PERIOD_OPTIONS = [
  { value: "24h", label: "Últimas 24h" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "custom", label: "Personalizado" },
];

const ACTION_OPTIONS = [
  { value: "all", label: "Todas as ações" },
  { value: "login", label: "Login" },
  { value: "task_created", label: "Tarefa criada" },
  { value: "task_status_changed", label: "Status alterado" },
  { value: "task_deleted", label: "Tarefa excluída" },
];

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;
  switch (period) {
    case "24h": start = new Date(now.getTime() - 86400000); break;
    case "7d": start = new Date(now.getTime() - 7 * 86400000); break;
    case "30d": start = new Date(now.getTime() - 30 * 86400000); break;
    default: start = new Date(now.getTime() - 86400000);
  }
  return { start: start.toISOString(), end };
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    login: "Login",
    task_created: "Tarefa criada",
    task_status_changed: "Status alterado",
    task_deleted: "Tarefa excluída",
  };
  return map[action] || action;
}

function actionBadge(action: string) {
  const colors: Record<string, string> = {
    login: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    task_created: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    task_status_changed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    task_deleted: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return (
    <Badge variant="outline" className={colors[action] || ""}>{actionLabel(action)}</Badge>
  );
}

function formatDate(iso: string) {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  } catch {
    return iso;
  }
}

function formatMetadata(meta: Record<string, unknown> | null): string {
  if (!meta) return "—";
  const parts: string[] = [];
  if (meta.title) parts.push(`"${meta.title}"`);
  if (meta.old_status && meta.new_status) parts.push(`${meta.old_status} → ${meta.new_status}`);
  if (meta.status && !meta.old_status) parts.push(`Status: ${meta.status}`);
  return parts.length > 0 ? parts.join(" | ") : JSON.stringify(meta);
}

const PAGE_SIZE = 50;

export default function AuditLog() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState("24h");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(0);

  const [stats, setStats] = useState<AuditStat[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && !profile.is_master) navigate("/dashboard", { replace: true });
  }, [profile, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let start: string, end: string;
      if (period === "custom" && customStart && customEnd) {
        start = new Date(customStart).toISOString();
        end = new Date(customEnd + "T23:59:59").toISOString();
      } else {
        const range = getDateRange(period);
        start = range.start;
        end = range.end;
      }

      const actionParam = actionFilter === "all" ? null : actionFilter;

      const [statsRes, logsRes] = await Promise.all([
        supabase.rpc("get_audit_stats", { _start: start, _end: end }),
        supabase.rpc("get_audit_logs", {
          _start: start,
          _end: end,
          _action: actionParam,
          _user_id: null,
          _limit: PAGE_SIZE,
          _offset: page * PAGE_SIZE,
        }),
      ]);

      if (statsRes.data) setStats(statsRes.data as AuditStat[]);
      if (logsRes.data) setLogs(logsRes.data as AuditLog[]);
    } catch (err) {
      console.error("Failed to fetch audit data:", err);
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, actionFilter, page]);

  useEffect(() => {
    if (profile?.is_master) fetchData();
  }, [fetchData, profile]);

  if (!profile?.is_master) return null;

  const totalActions = stats.reduce((s, r) => s + r.count, 0);
  const loginCount = stats.find(s => s.action === "login")?.count || 0;
  const taskCreatedCount = stats.find(s => s.action === "task_created")?.count || 0;
  const statusChangedCount = stats.find(s => s.action === "task_status_changed")?.count || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de Ações</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{totalActions}</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Logins</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><LogIn className="h-5 w-5 text-blue-500" /><span className="text-2xl font-bold">{loginCount}</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tarefas Criadas</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><PlusCircle className="h-5 w-5 text-green-500" /><span className="text-2xl font-bold">{taskCreatedCount}</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Alterações de Status</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><ArrowUpDown className="h-5 w-5 text-yellow-500" /><span className="text-2xl font-bold">{statusChangedCount}</span></div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-44">
          <label className="text-xs text-muted-foreground mb-1 block">Período</label>
          <Select value={period} onValueChange={(v) => { setPeriod(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {period === "custom" && (
          <>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Início</label>
              <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fim</label>
              <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-40" />
            </div>
          </>
        )}
        <div className="w-48">
          <label className="text-xs text-muted-foreground mb-1 block">Ação</label>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
                ) : logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">{formatDate(log.created_at)}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{log.user_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{log.user_email || ""}</div>
                    </TableCell>
                    <TableCell>{actionBadge(log.action)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.entity_type || "—"}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{formatMetadata(log.metadata as Record<string, unknown> | null)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {logs.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {page + 1}</span>
              <Button variant="outline" size="sm" disabled={logs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
