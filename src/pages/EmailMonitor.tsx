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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, CheckCircle, XCircle, Ban, RefreshCw, ChevronLeft, ChevronRight, Inbox, Pencil, Save, User, FileText } from "lucide-react";
import { toast } from "sonner";

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

const TEMPLATE_DISPLAY_NAMES: Record<string, string> = {
  "task-reminder-5min": "Lembrete 5min antes",
  "task-late-start": "Início atrasado",
  "task-overdue": "Prazo excedido",
  "task-in-progress-overdue": "Em andamento + atrasada",
  "task-previous-day-unstarted": "Não iniciada ontem",
};

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

type TemplateOverride = {
  template_name: string;
  subject_override: string;
  heading_override: string;
  body_override: string;
};

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

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, TemplateOverride>>({});
  const [editForm, setEditForm] = useState<TemplateOverride>({ template_name: "", subject_override: "", heading_override: "", body_override: "" });
  const [saving, setSaving] = useState(false);

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

  const fetchOverrides = useCallback(async () => {
    const { data } = await supabase
      .from("email_template_overrides")
      .select("template_name, subject_override, heading_override, body_override");
    if (data) {
      const map: Record<string, TemplateOverride> = {};
      data.forEach((row: any) => {
        map[row.template_name] = row;
      });
      setOverrides(map);
    }
  }, []);

  useEffect(() => {
    if (isMaster) {
      fetchData();
      fetchOverrides();
    }
  }, [fetchData, fetchOverrides, isMaster]);

  const openEditor = (templateName: string) => {
    const existing = overrides[templateName];
    setEditForm({
      template_name: templateName,
      subject_override: existing?.subject_override || "",
      heading_override: existing?.heading_override || "",
      body_override: existing?.body_override || "",
    });
    setEditingTemplate(templateName);
  };

  const saveOverride = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("email_template_overrides")
      .upsert(
        {
          template_name: editForm.template_name,
          subject_override: editForm.subject_override || null,
          heading_override: editForm.heading_override || null,
          body_override: editForm.body_override || null,
          updated_at: new Date().toISOString(),
          updated_by: profile?.id,
        },
        { onConflict: "template_name" }
      );
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar personalização");
    } else {
      toast.success("Template personalizado salvo!");
      setEditingTemplate(null);
      fetchOverrides();
    }
  };

  if (!isMaster) return <Navigate to="/dashboard" replace />;

  const total = stats.reduce((s, r) => s + Number(r.count), 0);
  const sent = Number(stats.find(s => s.status === "sent")?.count ?? 0);
  const failed = Number(stats.find(s => s.status === "dlq")?.count ?? 0);
  const suppressed = Number(stats.find(s => s.status === "suppressed")?.count ?? 0);

  const allTemplateNames = Object.keys(TEMPLATE_DISPLAY_NAMES);

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

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Logs de Envio</TabsTrigger>
          <TabsTrigger value="templates">Personalizar Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
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
                      {templates.map(t => <SelectItem key={t} value={t}>{TEMPLATE_DISPLAY_NAMES[t] || t}</SelectItem>)}
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template</TableHead>
                        <TableHead>Destinatário</TableHead>
                        <TableHead>Tarefa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const meta = log.metadata as Record<string, any> | null;
                        const assigneeName = meta?.assigneeName as string | undefined;
                        const taskTitle = meta?.taskTitle as string | undefined;
                        const taskId = meta?.taskId as string | undefined;

                        return (
                          <TableRow key={log.message_id}>
                            <TableCell className="font-medium text-sm">
                              {TEMPLATE_DISPLAY_NAMES[log.template_name] || log.template_name}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex flex-col">
                                {assigneeName && (
                                  <span className="flex items-center gap-1 font-medium text-foreground">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    {assigneeName}
                                  </span>
                                )}
                                <span className="text-muted-foreground">{log.recipient_email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {taskTitle ? (
                                <div className="flex flex-col">
                                  <span className="flex items-center gap-1 font-medium text-foreground">
                                    <FileText className="h-3 w-3 text-muted-foreground" />
                                    {taskTitle}
                                  </span>
                                  {taskId && (
                                    <span className="text-xs text-muted-foreground font-mono">{taskId.slice(0, 8)}…</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>{statusBadge(log.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                            <TableCell className="text-sm text-destructive max-w-xs truncate" title={log.error_message ?? ""}>{log.error_message ?? "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {logs.length > 0 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">Página {page + 1}</p>
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
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personalizar Templates de Email</CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize o assunto, título e corpo dos emails de notificação. Use <code className="bg-muted px-1 rounded text-xs">{"{{taskTitle}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{startTime}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{dueTime}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{originalDate}}"}</code> como variáveis no assunto.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {allTemplateNames.map((tplName) => {
                  const hasOverride = !!overrides[tplName];
                  return (
                    <div
                      key={tplName}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{TEMPLATE_DISPLAY_NAMES[tplName]}</p>
                          <p className="text-xs text-muted-foreground font-mono">{tplName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasOverride && (
                          <Badge variant="secondary" className="text-xs">Personalizado</Badge>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEditor(tplName)} className="gap-1">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Editor Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Personalizar: {TEMPLATE_DISPLAY_NAMES[editingTemplate || ""] || editingTemplate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assunto do email</Label>
              <Input
                placeholder="Ex: ⏰ Tarefa {{taskTitle}} começa em breve"
                value={editForm.subject_override}
                onChange={(e) => setEditForm(prev => ({ ...prev, subject_override: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para usar o assunto padrão.</p>
            </div>
            <div className="space-y-2">
              <Label>Título (heading) do email</Label>
              <Input
                placeholder="Ex: Atenção! Tarefa próxima do horário"
                value={editForm.heading_override}
                onChange={(e) => setEditForm(prev => ({ ...prev, heading_override: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Substitui o título principal no corpo do email.</p>
            </div>
            <div className="space-y-2">
              <Label>Corpo / mensagem</Label>
              <Textarea
                placeholder="Ex: Olá! Sua tarefa está prestes a começar. Acesse a plataforma para acompanhar."
                value={editForm.body_override}
                onChange={(e) => setEditForm(prev => ({ ...prev, body_override: e.target.value }))}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Substitui o texto descritivo do email.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancelar</Button>
              <Button onClick={saveOverride} disabled={saving} className="gap-1">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
