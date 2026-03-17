import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Search, List, CalendarDays, LayoutGrid, Pencil, Trash2, X, User, Clock, Building2, CalendarIcon, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateTaskStatus } from "@/lib/task-utils";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import TaskCalendar from "@/components/tasks/TaskCalendar";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TaskForm from "@/components/tasks/TaskForm";
import TaskImportDialog from "@/components/tasks/TaskImportDialog";
import { TasksSkeleton } from "@/components/skeletons/TasksSkeleton";

type Task = Tables<"tasks">;
type Profile = Tables<"profiles">;
type Department = Tables<"departments">;

const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluída", overdue: "Atrasada" };
const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
};
const recurrenceLabels: Record<string, string> = { none: "Nenhuma", daily: "Diária", weekly: "Semanal", monthly: "Mensal", yearly: "Anual" };

export default function Tasks() {
  const { user, role, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar">("kanban");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>("start_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterRecurrence, setFilterRecurrence] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());

  const canManage = role === "admin" || role === "manager" || role === "coordinator";

  const fetchTasks = async () => {
    let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (role === "analyst" && user) query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
    const { data } = await query;
    if (data) setTasks(data);
    setLoading(false);
  };

  const fetchMembers = async () => {
    if (!currentProfile?.company_id) return;
    const { data } = await supabase.from("profiles").select("*").eq("company_id", currentProfile.company_id);
    if (data) setMembers(data);
  };

  const fetchDepartments = async () => {
    if (!currentProfile?.company_id) return;
    const { data } = await supabase.from("departments").select("*").eq("company_id", currentProfile.company_id).order("name");
    if (data) setDepartments(data);
  };

  useEffect(() => { if (user && currentProfile?.company_id) { fetchTasks(); fetchMembers(); fetchDepartments(); } }, [user, currentProfile?.company_id]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (task: Task) => { setEditing(task); setFormOpen(true); };
  const openDetail = (task: Task) => { setDetailTask(task); setDetailOpen(true); };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Tarefa removida" });
    fetchTasks();
  };

  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Otimista: atualizar UI imediatamente
    const previousTasks = tasks;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } as Task : t));

    if (newStatus === "in_progress") {
      setHighlightedId(taskId);
      setTimeout(() => setHighlightedId(null), 800);
    } else if (newStatus === "completed") {
      setSuccessId(taskId);
      setTimeout(() => setSuccessId(null), 1000);
    }

    try {
      const { generatedRecurring } = await updateTaskStatus(taskId, newStatus as any, task);
      if (generatedRecurring) {
        
        toast({ title: "Status atualizado! Próxima recorrência gerada." });
      } else {
        toast({ title: "Status atualizado!" });
      }
      await fetchTasks();
    } catch {
      setTasks(previousTasks);
      toast({ variant: "destructive", title: "Erro ao atualizar status" });
    }
  }, [tasks, toast, fetchTasks]);

  const getMemberName = (id: string | null) => {
    if (!id) return "Não atribuída";
    return members.find((m) => m.id === id)?.full_name || "—";
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return null;
    return departments.find((d) => d.id === departmentId)?.name || null;
  };

  const hasActiveFilters = search || filterStatus !== "all" || filterDepartment !== "all" || filterAssignee !== "all" || filterRecurrence !== "all" || (filterDate !== undefined && startOfDay(filterDate).getTime() !== startOfDay(new Date()).getTime());

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterDepartment("all");
    setFilterAssignee("all");
    setFilterRecurrence("all");
    setFilterDate(new Date());
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterDepartment !== "all" && t.department_id !== filterDepartment) return false;
      if (filterAssignee !== "all" && t.assigned_to !== filterAssignee) return false;
      if (filterRecurrence !== "all" && t.recurrence_type !== filterRecurrence) return false;
      if (filterDate && viewMode !== "calendar") {
        const dayStart = startOfDay(filterDate);
        const dayEnd = endOfDay(filterDate);
        const taskStart = t.start_date ? parseISO(t.start_date) : null;
        const taskDue = t.due_date ? parseISO(t.due_date) : null;
        const matchesDate = (taskStart && isWithinInterval(taskStart, { start: dayStart, end: dayEnd })) ||
          (taskDue && isWithinInterval(taskDue, { start: dayStart, end: dayEnd })) ||
          (taskStart && taskDue && taskStart <= dayEnd && taskDue >= dayStart);
        if (!matchesDate) return false;
      }
      return true;
    });
  }, [tasks, search, filterStatus, filterDepartment, filterAssignee, filterRecurrence, filterDate, viewMode]);

  const sortedFiltered = useMemo(() => {
    if (!sortColumn) return filtered;
    const sorted = [...filtered].sort((a, b) => {
      let valA: string | null = null;
      let valB: string | null = null;
      switch (sortColumn) {
        case "title": valA = a.title; valB = b.title; break;
        case "status": valA = a.status; valB = b.status; break;
        case "department": valA = getDepartmentName(a.department_id) || ""; valB = getDepartmentName(b.department_id) || ""; break;
        case "recurrence": valA = a.recurrence_type; valB = b.recurrence_type; break;
        case "assignee": valA = getMemberName(a.assigned_to); valB = getMemberName(b.assigned_to); break;
        case "start_date": valA = a.start_date || ""; valB = b.start_date || ""; break;
        case "due_date": valA = a.due_date || ""; valB = b.due_date || ""; break;
        default: return 0;
      }
      const cmp = (valA || "").localeCompare(valB || "", "pt-BR");
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filtered, sortColumn, sortDirection, members, departments]);

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else { setSortColumn(null); setSortDirection("asc"); }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const kanbanColumns = ["pending", "in_progress", "completed", "overdue"] as const;

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    if (newStatus === "overdue") return; // coluna calculada, não aceita drop
    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;
    // Verificar permissão: employee só pode arrastar as próprias
    if (role === "analyst" && task.assigned_to !== user?.id) return;
    // Determinar status atual real da tarefa
    const currentEffective = task.status === "pending" && task.due_date && task.due_date < new Date().toISOString() ? "overdue" : task.status;
    if (newStatus === currentEffective) return; // sem mudança
    await handleStatusChange(draggableId, newStatus);
  }, [tasks, role, user?.id, handleStatusChange]);

  if (loading) return <TasksSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie as tarefas da sua equipe</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            <Button variant={viewMode === "kanban" ? "default" : "ghost"} size="sm" className="rounded-none rounded-l-lg" onClick={() => setViewMode("kanban")}>
              <LayoutGrid className="mr-1.5 h-4 w-4" /> Kanban
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("list")}>
              <List className="mr-1.5 h-4 w-4" /> Lista
            </Button>
            <Button variant={viewMode === "calendar" ? "default" : "ghost"} size="sm" className="rounded-none rounded-r-lg" onClick={() => setViewMode("calendar")}>
              <CalendarDays className="mr-1.5 h-4 w-4" /> Calendário
            </Button>
          </div>
          {canManage && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar Excel
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar tarefas..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {canManage && (
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-[160px]">
                  <Building2 className="mr-1.5 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {canManage && (
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-[170px]">
                  <User className="mr-1.5 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.id}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterRecurrence} onValueChange={setFilterRecurrence}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Recorrência" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !filterDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-4 w-4" />
                  {filterDate ? format(filterDate, "dd/MM/yyyy") : "Filtrar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-2 border-b">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={() => setFilterDate(undefined)}>
                    Todos os dias
                  </Button>
                </div>
                <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="mr-1 h-4 w-4" /> Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 stagger-fade-in">
            {kanbanColumns.map((status) => {
              const columnTasks = filtered.filter((t) => {
                if (status === "overdue") return (t.status === "overdue") || (t.due_date && t.due_date < new Date().toISOString() && t.status === "pending");
                if (status === "pending") return t.status === "pending" && !(t.due_date && t.due_date < new Date().toISOString());
                if (status === "in_progress") return t.status === "in_progress";
                return t.status === status;
              });
              const dotColor = status === "pending" ? "bg-muted-foreground" : status === "in_progress" ? "bg-primary" : status === "completed" ? "bg-success" : "bg-destructive";
              const isOverdueColumn = status === "overdue";
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                    <h3 className="text-sm font-semibold">{statusLabels[status]}</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">{columnTasks.length}</Badge>
                  </div>
                  <Droppable droppableId={status} isDropDisabled={isOverdueColumn}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "space-y-2 min-h-[100px] rounded-lg transition-all duration-300",
                          snapshot.isDraggingOver && !isOverdueColumn && "bg-primary/5 ring-2 ring-primary/20 animate-ring-pulse scale-[1.01]"
                        )}
                      >
                        {columnTasks.map((task, index) => {
                          const deptName = getDepartmentName(task.department_id);
                          const isDragDisabled = role === "analyst" && task.assigned_to !== user?.id;
                          return (
                            <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={isDragDisabled}>
                              {(dragProvided, dragSnapshot) => {
                                const cardElement = (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                  >
                                    <Card
                                      className={cn(
                                        "cursor-pointer hover-lift transition-all duration-200",
                                        highlightedId === task.id && "animate-highlight-flash",
                                        successId === task.id && "animate-highlight-success animate-pulse-success",
                                        dragSnapshot.isDragging && "shadow-2xl ring-2 ring-primary/40 rotate-[2deg] scale-105 z-50",
                                        isDragDisabled && "cursor-default"
                                      )}
                                      onClick={() => !dragSnapshot.isDragging && openDetail(task)}
                                    >
                                      <CardContent className="p-4 space-y-3">
                                        <h4 className="font-medium leading-tight text-sm">{task.title}</h4>
                                        {task.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {deptName && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                              <Building2 className="mr-1 h-3 w-3" />{deptName}
                                            </Badge>
                                          )}
                                          {task.recurrence_type !== "none" && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                              {recurrenceLabels[task.recurrence_type]}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                          <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span className="truncate max-w-[100px]">{getMemberName(task.assigned_to)}</span>
                                          </div>
                                          {task.due_date && (
                                            <div className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              <span>{format(new Date(task.due_date), "dd/MM")}</span>
                                            </div>
                                          )}
                                        </div>
                                        {/* Quick actions */}
                                        <div className="flex items-center gap-1 pt-1 border-t" onClick={(e) => e.stopPropagation()}>
                                          {role === "analyst" && task.assigned_to === user?.id && (
                                            <>
                                              {task.status === "pending" && (
                                                <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => handleStatusChange(task.id, "in_progress")}>Iniciar</Button>
                                              )}
                                              {task.status === "in_progress" && (
                                                <Button size="sm" variant="ghost" className="h-7 text-xs flex-1 text-success" onClick={() => handleStatusChange(task.id, "completed")}>Concluir</Button>
                                              )}
                                            </>
                                          )}
                                          {canManage && (
                                            <>
                                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(task)}><Pencil className="h-3.5 w-3.5" /></Button>
                                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(task.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                            </>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                );
                                return dragSnapshot.isDragging
                                  ? createPortal(cardElement, document.body)
                                  : cardElement;
                              }}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {columnTasks.length === 0 && (
                          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                            Nenhuma tarefa
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <TaskCalendar tasks={filtered} onTaskClick={openDetail} />
      )}

      {/* List View */}
      {viewMode === "list" && (
        <ScrollArea className="w-full rounded-lg border">
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] cursor-pointer select-none" onClick={() => toggleSort("title")}>
                  <span className="flex items-center">Tarefa <SortIcon column="title" /></span>
                </TableHead>
                <TableHead className="min-w-[120px] cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  <span className="flex items-center">Status <SortIcon column="status" /></span>
                </TableHead>
                <TableHead className="min-w-[130px] cursor-pointer select-none" onClick={() => toggleSort("department")}>
                  <span className="flex items-center">Departamento <SortIcon column="department" /></span>
                </TableHead>
                <TableHead className="min-w-[100px] cursor-pointer select-none" onClick={() => toggleSort("recurrence")}>
                  <span className="flex items-center">Recorrência <SortIcon column="recurrence" /></span>
                </TableHead>
                <TableHead className="min-w-[150px] cursor-pointer select-none" onClick={() => toggleSort("assignee")}>
                  <span className="flex items-center">Responsável <SortIcon column="assignee" /></span>
                </TableHead>
                <TableHead className="min-w-[150px] cursor-pointer select-none" onClick={() => toggleSort("start_date")}>
                  <span className="flex items-center">Início <SortIcon column="start_date" /></span>
                </TableHead>
                <TableHead className="min-w-[150px] cursor-pointer select-none" onClick={() => toggleSort("due_date")}>
                  <span className="flex items-center">Término <SortIcon column="due_date" /></span>
                </TableHead>
                <TableHead className="min-w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiltered.map((task) => {
                const deptName = getDepartmentName(task.department_id);
                return (
                  <TableRow key={task.id} className={`cursor-pointer transition-colors ${
                    highlightedId === task.id ? "animate-highlight-flash" : ""
                  } ${successId === task.id ? "animate-highlight-success" : ""}`} onClick={() => openDetail(task)}>
                    <TableCell className="font-medium">
                      <div className="truncate max-w-[300px]">{task.title}</div>
                      {task.description && <p className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">{task.description}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[task.status]} animate-scale-in`} variant="secondary">{statusLabels[task.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {deptName ? <Badge variant="outline" className="text-xs">{deptName}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {recurrenceLabels[task.recurrence_type]}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getMemberName(task.assigned_to)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {task.start_date ? format(new Date(task.start_date), "dd/MM/yyyy HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {task.due_date ? format(new Date(task.due_date), "dd/MM/yyyy HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {(role === "analyst" && task.assigned_to === user?.id) && (
                          <>
                            {task.status === "pending" && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusChange(task.id, "in_progress")}>Iniciar</Button>
                            )}
                            {task.status === "in_progress" && (
                              <Button size="sm" variant="outline" className="text-success border-success hover:bg-success/10" onClick={() => handleStatusChange(task.id, "completed")}>Concluir</Button>
                            )}
                            {task.status === "completed" && (
                              <Badge className="bg-success/10 text-success">✓</Badge>
                            )}
                          </>
                        )}
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(task)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Nenhuma tarefa encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <TaskForm open={formOpen} onOpenChange={setFormOpen} editing={editing} members={members} departments={departments} onSaved={fetchTasks} />
      <TaskDetailModal task={detailTask} open={detailOpen} onOpenChange={setDetailOpen} members={members} departments={departments} onEdit={openEdit} onRefresh={fetchTasks} />
      <TaskImportDialog open={importOpen} onOpenChange={setImportOpen} members={members} departments={departments} onImported={fetchTasks} />
    </div>
  );
}
