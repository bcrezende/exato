import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRecurrenceDefinitions } from "@/hooks/useRecurrenceDefinitions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Department = Tables<"departments">;

interface TaskImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Profile[];
  departments: Department[];
  onImported: () => void;
}

interface ParsedRow {
  rowIndex: number;
  titulo: string;
  descricao: string;
  responsavel_email: string;
  setor: string;
  data_inicio: string;
  data_termino: string;
  recorrencia: string;
  errors: string[];
  valid: boolean;
  assignedToId?: string;
  departmentId?: string;
  startDate?: string;
  dueDate?: string;
  recurrenceType?: string;
}

interface Assignee {
  profile_id: string;
  email: string;
  full_name: string | null;
  department_id: string | null;
}

const RECURRENCE_MAP: Record<string, string> = {
  nenhuma: "none",
  diaria: "daily",
  diária: "daily",
  semanal: "weekly",
  mensal: "monthly",
  anual: "yearly",
};

/** Normalize text: trim, lowercase, remove accents, collapse spaces */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parseBrDate(raw: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  if (!isNaN(Number(trimmed))) {
    const excelDate = XLSX.SSF.parse_date_code(Number(trimmed));
    if (excelDate) {
      return new Date(excelDate.y, excelDate.m - 1, excelDate.d, excelDate.H || 0, excelDate.M || 0);
    }
  }

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min] = match;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh || 0), Number(min || 0));
  if (isNaN(d.getTime())) return null;
  return d;
}

function resolveDate(rawValue: any, stringValue: string): string | undefined {
  if (rawValue instanceof Date && !isNaN(rawValue.getTime())) {
    return rawValue.toISOString();
  }
  if (typeof rawValue === "number") {
    const excelDate = XLSX.SSF.parse_date_code(rawValue);
    if (excelDate) {
      return new Date(excelDate.y, excelDate.m - 1, excelDate.d, excelDate.H || 0, excelDate.M || 0).toISOString();
    }
  }
  if (stringValue) {
    const d = parseBrDate(stringValue);
    if (d) return d.toISOString();
  }
  return undefined;
}

export default function TaskImportDialog({ open, onOpenChange, members, departments, onImported }: TaskImportDialogProps) {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [result, setResult] = useState<{ created: number; errors: number }>({ created: 0, errors: 0 });
  const [assignees, setAssignees] = useState<Assignee[]>([]);

  // Fetch assignees via RPC when dialog opens
  useEffect(() => {
    if (!open) return;
    const fetchAssignees = async () => {
      const { data, error } = await supabase.rpc("get_task_import_assignees");
      if (data && !error) {
        setAssignees(data as Assignee[]);
      }
    };
    fetchAssignees();
  }, [open]);

  // Build normalized lookup maps
  const findMember = (identifier: string): Assignee | undefined => {
    if (!identifier) return undefined;
    const norm = normalize(identifier);

    // Try email match
    const byEmail = assignees.find((a) => normalize(a.email) === norm);
    if (byEmail) return byEmail;

    // Try full_name match
    return assignees.find((a) => a.full_name && normalize(a.full_name) === norm);
  };

  const findDepartment = (name: string): Department | undefined => {
    if (!name) return undefined;
    const norm = normalize(name);
    return departments.find((d) => normalize(d.name) === norm);
  };

  const handleFile = async (file: File) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

    if (jsonData.length === 0) {
      toast({ variant: "destructive", title: "Arquivo vazio", description: "A planilha não contém dados." });
      return;
    }

    const parsed: ParsedRow[] = jsonData.map((row, idx) => {
      // Keep raw values with original types (Date objects preserved)
      const rawValues: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        rawValues[normalize(key)] = row[key];
      }

      // String versions for non-date fields
      const str = (key: string): string => {
        const v = rawValues[key];
        if (v instanceof Date) return "";
        return v != null ? String(v).trim() : "";
      };

      // Try multiple normalized header variants
      const getVal = (...keys: string[]) => {
        for (const k of keys) {
          const v = str(k);
          if (v) return v;
        }
        return "";
      };

      const getRaw = (...keys: string[]) => {
        for (const k of keys) {
          if (rawValues[k] !== undefined && rawValues[k] !== "") return rawValues[k];
        }
        return undefined;
      };

      const titulo = getVal("titulo", "título");
      const descricao = getVal("descricao", "descricão", "descrição");
      const responsavelEmail = getVal("responsavel_email", "responsavel_email", "responsavel", "responsável_email", "responsavel");
      const setor = getVal("setor", "departamento");
      const recorrencia = getVal("recorrencia", "recorrência");

      const errors: string[] = [];

      if (!titulo) errors.push("Título obrigatório");
      if (!responsavelEmail) errors.push("Responsável obrigatório");
      if (!setor && role === "admin") errors.push("Setor obrigatório");
      if (!recorrencia) errors.push("Recorrência obrigatória");

      // Resolve dates
      const rawInicio = getRaw("data_inicio", "data_início");
      const rawTermino = getRaw("data_termino", "data_término");
      const dataInicioStr = getVal("data_inicio", "data_início");
      const dataTerminoStr = getVal("data_termino", "data_término");

      const startDate = resolveDate(rawInicio, dataInicioStr);
      const dueDate = resolveDate(rawTermino, dataTerminoStr);

      if (!startDate) {
        if (rawInicio != null && rawInicio !== "") {
          errors.push("Data início inválida (use DD/MM/AAAA HH:MM)");
        } else {
          errors.push("Data início obrigatória");
        }
      }
      if (!dueDate) {
        if (rawTermino != null && rawTermino !== "") {
          errors.push("Data término inválida (use DD/MM/AAAA HH:MM)");
        } else {
          errors.push("Data término obrigatória");
        }
      }

      // Match member
      let assignedToId: string | undefined;
      if (responsavelEmail) {
        const member = findMember(responsavelEmail);
        if (member) {
          assignedToId = member.profile_id;
        } else {
          errors.push(`Responsável "${responsavelEmail}" não encontrado`);
        }
      }

      // Match department
      let departmentId: string | undefined;
      if (role === "manager") {
        // Manager: always use their own department
        departmentId = profile?.department_id || undefined;
        if (setor) {
          const dept = findDepartment(setor);
          if (dept && dept.id !== departmentId) {
            errors.push(`Setor "${setor}" difere do seu setor — tarefas serão criadas no seu setor`);
            // Still allow import but in their department
          }
        }
      } else {
        // Admin: validate against department list
        if (setor) {
          const dept = findDepartment(setor);
          if (dept) {
            departmentId = dept.id;
          } else {
            errors.push(`Setor "${setor}" não encontrado`);
          }
        }
      }

      // Validate recurrence
      let recurrenceType: string | undefined;
      if (recorrencia) {
        const mapped = RECURRENCE_MAP[normalize(recorrencia)];
        if (mapped) {
          recurrenceType = mapped;
        } else {
          errors.push(`Recorrência "${recorrencia}" inválida`);
        }
      }

      // For manager with department mismatch warning, still consider valid if department resolved
      const filteredErrors = errors.filter(e => !e.includes("difere do seu setor"));

      return {
        rowIndex: idx + 2,
        titulo,
        descricao,
        responsavel_email: responsavelEmail,
        setor,
        data_inicio: startDate ? new Date(startDate).toLocaleDateString("pt-BR") : dataInicioStr,
        data_termino: dueDate ? new Date(dueDate).toLocaleDateString("pt-BR") : dataTerminoStr,
        recorrencia,
        errors,
        valid: filteredErrors.length === 0,
        assignedToId,
        departmentId,
        startDate,
        dueDate,
        recurrenceType,
      };
    });

    setRows(parsed);
    setStep("preview");
  };

  const handleImport = async () => {
    if (!user || !profile?.company_id) return;
    setImporting(true);

    const validRows = rows.filter((r) => r.valid);
    const tasksToInsert = validRows.map((r) => ({
      title: r.titulo,
      description: r.descricao || null,
      assigned_to: r.assignedToId!,
      department_id: r.departmentId!,
      company_id: profile.company_id!,
      created_by: user.id,
      start_date: r.startDate!,
      due_date: r.dueDate!,
      recurrence_type: r.recurrenceType as any,
      status: "pending" as const,
      priority: "medium" as const,
    }));

    const { error } = await supabase.from("tasks").insert(tasksToInsert);

    if (error) {
      toast({ variant: "destructive", title: "Erro na importação", description: error.message });
    } else {
      setResult({ created: validRows.length, errors: rows.length - validRows.length });
      setStep("done");
      toast({ title: "Importação concluída", description: `${validRows.length} tarefa(s) criada(s).` });
      onImported();
    }
    setImporting(false);
  };

  const handleClose = () => {
    setRows([]);
    setStep("upload");
    setResult({ created: 0, errors: 0 });
    onOpenChange(false);
  };

  const validCount = rows.filter((r) => r.valid).length;
  const errorCount = rows.filter((r) => !r.valid).length;

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["titulo", "descricao", "responsavel_email", "setor", "data_inicio", "data_termino", "recorrencia"],
      ["Exemplo de tarefa", "Descrição opcional", "email@exemplo.com", "Financeiro", "15/03/2026 09:00", "20/03/2026 18:00", "nenhuma"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tarefas");
    XLSX.writeFile(wb, "modelo_importacao_tarefas.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Tarefas via Excel
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo .xlsx com as tarefas para criar em lote.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <div
              className="w-full border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Clique para selecionar o arquivo</p>
              <p className="text-sm text-muted-foreground mt-1">Formato aceito: .xlsx</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Baixar modelo Excel
            </Button>
            <div className="text-xs text-muted-foreground max-w-md text-center space-y-1">
              <p><strong>Colunas obrigatórias:</strong> titulo, responsavel_email (email ou nome completo), setor, data_inicio, data_termino, recorrencia</p>
              <p><strong>Coluna opcional:</strong> descricao</p>
              <p><strong>Recorrência:</strong> nenhuma, diaria, semanal, mensal, anual</p>
              <p><strong>Datas:</strong> DD/MM/AAAA HH:MM ou formato de data do Excel</p>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {validCount} válida(s)
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  {errorCount} com erro(s)
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">Total: {rows.length} linha(s)</span>
            </div>
            <ScrollArea className="flex-1 border rounded-lg max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Linha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Término</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.rowIndex} className={row.valid ? "" : "bg-destructive/5"}>
                      <TableCell className="text-xs">{row.rowIndex}</TableCell>
                      <TableCell>
                        {row.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[150px] truncate">{row.titulo || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{row.responsavel_email || "—"}</TableCell>
                      <TableCell className="text-xs">{row.setor || "—"}</TableCell>
                      <TableCell className="text-xs">{row.data_inicio || "—"}</TableCell>
                      <TableCell className="text-xs">{row.data_termino || "—"}</TableCell>
                      <TableCell className="text-xs">{row.recorrencia || "—"}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px]">
                        {row.errors.length > 0 ? row.errors.join("; ") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {step === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <CheckCircle2 className="h-16 w-16 text-success" />
            <p className="text-xl font-semibold">Importação concluída!</p>
            <div className="flex gap-4 text-sm">
              <span className="text-success font-medium">{result.created} tarefa(s) criada(s)</span>
              {result.errors > 0 && <span className="text-destructive font-medium">{result.errors} linha(s) com erro</span>}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => { setRows([]); setStep("upload"); }}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0 || importing}>
                {importing ? "Importando..." : `Importar ${validCount} tarefa(s)`}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
