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
import { Plus, Search, List, CalendarDays, LayoutGrid, Pencil, Trash2, X, User, Building2, CalendarIcon, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { toDisplayDate, formatStoredDate, getTodayRange, nowAsFakeUTC } from "@/lib/date-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateTaskStatus } from "@/lib/task-utils";
import { useRecurrenceDefinitions } from "@/hooks/useRecurrenceDefinitions";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import TaskCalendar from "@/components/tasks/TaskCalendar";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TaskForm from "@/components/tasks/TaskForm";
import TaskImportDialog from "@/components/tasks/TaskImportDialog";
import { TasksSkeleton } from "@/components/skeletons/TasksSkeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

export default function Tasks() {
  const { user, role, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const { definitions, getLabelsMap, getLabel } = useRecurrenceDefinitions();
  const recurrenceLabels = getLabelsMap();
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

  // Count active filters (excluding search and today's date)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== "all") count++;
    if (filterDepartment !== "all") count++;
    if (filterAssignee !== "all") count++;
    if (filterRecurrence !== "all") count++;
    if (filterDate !== undefined && startOfDay(filterDate).getTime() !== startOfDay(new Date()).getTime()) count++;
    return count;
  }, [filterStatus, filterDepartment, filterAssignee, filterRecurrence, filterDate]);

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

  const getEffectiveRecurrenceType = (task: Task): string => {
    if (task.recurrence_type !== "none") return task.recurrence_type;
    if (task.recurrence_parent_id) {
      const parent = tasks.find(t => t.id === task.recurrence_parent_id);
      return parent?.recurrence_type || "none";
    }
    return "none";
  };

  const getMemberName = (id: string | null) => {
    if (!id) return "Não atribuída";
    return members.find((m) => m.id === id)?.full_name || "—";
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return null;
    return departments.find((d) => d.id === departmentId)?.name || null;
  };

  const hasActiveFilters = search || activeFilterCount > 0;

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
      if (filterRecurrence !== "all" && getEffectiveRecurrenceType(t) !== filterRecurrence) return false;
      if (filterDate && viewMode !== "calendar") {
        const dayStart = startOfDay(filterDate);
        const dayEnd = endOfDay(filterDate);
        const taskStart = t.start_date ? toDisplayDate(t.start_date) : null;
        const taskDue = t.due_date ? toDisplayDate(t.due_date) : null;
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
    if (newStatus === "overdue") return;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;
    if (role === "analyst" && task.assigned_to !== user?.id) return;
    const currentEffective = task.status === "pending" && task.due_date && task.due_date < nowAsFakeUTC() ? "overdue" : task.status;
    if (newStatus === currentEffective) return;
    await handleStatusChange(draggableId, newStatus);
  }, [tasks, role, user?.id, handleStatusChange]);

  if (loading) return <TasksSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header Compacto */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)} className="border rounded-lg">
            <ToggleGroupItem value="kanban" aria-label="Kanban" className="h-8 w-8 p-0">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Lista" className="h-8 w-8 p-0">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendário" className="h-8 w-8 p-0">
              <CalendarDays className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          {canManage && (
            <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Importar
            </Button>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Search + Filter Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar tarefas..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <Filter className="mr-1.5 h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-4" align="end">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {canManage && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Setor</label>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Setor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {canManage && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Responsável</label>
                  <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Responsável" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Recorrência</label>
                <Select value={filterRecurrence} onValueChange={setFilterRecurrence}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Recorrência" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {definitions.filter(d => d.key !== "none").map((d) => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1.5 h-4 w-4" />
                      {filterDate ? format(filterDate, "dd/MM/yyyy") : "Todos os dias"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-2 border-b">
                      <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={() => setFilterDate(undefined)}>
                        Todos os dias
                      </Button>
                    </div>
                    <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" /> Limpar filtros
              </Button>
            )}
          </PopoverContent>
        </Popover>
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={clearFilters} title="Limpar todos os filtros">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 stagger-fade-in">
            {kanbanColumns.map((status) => {
              const columnTasks = filtered.filter((t) => {
                if (status === "overdue") return (t.status === "overdue") || (t.due_date && t.due_date < nowAsFakeUTC() && t.status === "pending");
                if (status === "pending") return t.status === "pending" && !(t.due_date && t.due_date < nowAsFakeUTC());
                if (status === "in_progress") return t.status === "in_progress";
                return t.status === status;
              });
              const dotColor = status === "pending" ? "bg-muted-foreground" : status === "in_progress" ? "bg-primary" : status === "completed" ? "bg-success" : "bg-destructive";
              const isOverdueColumn = status === "overdue";
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                    <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <h3 className="text-sm font-semibold">{statusLabels[status]}</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">{columnTasks.length}</Badge>
                  </div>
                  <Droppable droppableId={status} isDropDisabled={isOverdueColumn}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "space-y-2 min-h-[80px] rounded-lg transition-all duration-300",
                          snapshot.isDraggingOver && !isOverdueColumn && "bg-primary/5 ring-2 ring-primary/20 animate-ring-pulse scale-[1.01]"
                        )}
                      >
                        {columnTasks.map((task, index) => {
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
                                      <CardContent className="p-3 space-y-2">
                                        <h4 className="font-medium leading-tight text-sm">{task.title}</h4>
                                        <div className="flex items-center justify-between">
                                          <Badge className={`${statusColors[task.status]} text-[10px] px-1.5 py-0`} variant="secondary">
                                            {statusLabels[task.status]}
                                          </Badge>
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            <span className="truncate max-w-[80px]">{getMemberName(task.assigned_to)}</span>
                                          </div>
                                        </div>
                                        {/* Quick actions */}
                                        <div className="flex items-center gap-1 pt-1 border-t" onClick={(e) => e.stopPropagation()}>
                                          {role === "analyst" && task.assigned_to === user?.id && (
                                            <>
                                              {task.status === "pending" && (
                                                <Button size="sm" variant="ghost" className="h-6 text-[11px] flex-1" onClick={() => handleStatusChange(task.id, "in_progress")}>Iniciar</Button>
                                              )}
                                              {task.status === "in_progress" && (
                                                <Button size="sm" variant="ghost" className="h-6 text-[11px] flex-1 text-success" onClick={() => handleStatusChange(task.id, "completed")}>Concluir</Button>
                                              )}
                                            </>
                                          )}
                                          {canManage && (
                                            <>
                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(task)}><Pencil className="h-3 w-3" /></Button>
                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(task.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
                          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
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
                      {getLabel(getEffectiveRecurrenceType(task))}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getMemberName(task.assigned_to)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatStoredDate(task.start_date)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatStoredDate(task.due_date)}
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
