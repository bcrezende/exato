import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, XCircle, Ban, RefreshCw, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

type EmailStat = { status: string; count: number };
type EmailLog = {
  message_id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const PERIOD_OPTIONS = [
  { label: "Últimas 24h", value: "24h" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "Personalizado", value: "custom" },
];

const STATUS_OPTIONS = [
  { label: "Todos", value: "all" },
  { label: "Enviados", value: "sent" },
  { label: "Falhas (DLQ)", value: "dlq" },
  { label: "Suprimidos", value: "suppressed" },
  { label: "Pendentes", value: "pending" },
];

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;
  switch (period) {
    case "24h": start = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case "7d": start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case "30d": start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    default: start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return { start: start.toISOString(), end };
}

function statusBadge(status: string) {
  switch (status) {
    case "sent": return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">Enviado</Badge>;
    case "dlq": return <Badge variant="destructive">Falha</Badge>;
    case "suppressed": return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-0">Suprimido</Badge>;
    case "pending": return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0">Pendente</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const PAGE_SIZE = 50;

export default function EmailMonitor() {
  const { profile } = useAuth();

  const [period, setPeriod] = useState("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);

  const [stats, setStats] = useState<EmailStat[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isMaster = profile?.is_master === true;

  const getRange = useCallback(() => {
    if (period === "custom" && customStart && customEnd) {
      return { start: new Date(customStart).toISOString(), end: new Date(customEnd + "T23:59:59").toISOString() };
    }
    return getDateRange(period);
  }, [period, customStart, customEnd]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getRange();
    const tpl = templateFilter === "all" ? null : templateFilter;
    const st = statusFilter === "all" ? null : statusFilter;

    const [statsRes, logsRes, tplRes] = await Promise.all([
      supabase.rpc("get_email_stats", { _start: start, _end: end, _template: tpl, _status: st }),
      supabase.rpc("get_email_logs", { _start: start, _end: end, _template: tpl, _status: st, _limit: PAGE_SIZE, _offset: page * PAGE_SIZE }),
      supabase.rpc("get_email_templates"),
    ]);

    if (statsRes.data) setStats(statsRes.data as EmailStat[]);
    if (logsRes.data) setLogs(logsRes.data as EmailLog[]);
    if (tplRes.data) setTemplates((tplRes.data as { template_name: string }[]).map(t => t.template_name));
    setLoading(false);
  }, [getRange, templateFilter, statusFilter, page]);

  useEffect(() => { if (isMaster) fetchData(); }, [fetchData, isMaster]);

  if (!isMaster) return <Navigate to="/dashboard" replace />;

  const total = stats.reduce((s, r) => s + Number(r.count), 0);
  const sent = Number(stats.find(s => s.status === "sent")?.count ?? 0);
  const failed = Number(stats.find(s => s.status === "dlq")?.count ?? 0);
  const suppressed = Number(stats.find(s => s.status === "suppressed")?.count ?? 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoramento de Emails</h1>
          <p className="text-sm text-muted-foreground">Acompanhe envios, falhas e status em tempo real</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enviados</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{sent}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Falhas (DLQ)</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{failed}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suprimidos</CardTitle>
            <Ban className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{suppressed}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <Select value={period} onValueChange={(v) => { setPeriod(v); setPage(0); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {period === "custom" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Início</label>
                  <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Fim</label>
                  <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-40" />
                </div>
              </>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Template</label>
              <Select value={templateFilter} onValueChange={(v) => { setTemplateFilter(v); setPage(0); }}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {templates.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {logs.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mb-2" />
              <p>Nenhum email encontrado para os filtros selecionados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.message_id}>
                    <TableCell className="font-medium text-sm">{log.template_name}</TableCell>
                    <TableCell className="text-sm">{log.recipient_email}</TableCell>
                    <TableCell>{statusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                    <TableCell className="text-sm text-destructive max-w-xs truncate" title={log.error_message ?? ""}>{log.error_message ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {logs.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Página {page + 1}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={logs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
