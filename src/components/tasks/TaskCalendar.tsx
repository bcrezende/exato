import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toDisplayDate, formatStoredDate } from "@/lib/date-utils";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type CalendarView = "month" | "week" | "day";

const statusCalendarColors: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  in_progress: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  completed: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  cancelled: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  overdue: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800" },
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function CurrentTimeLine({ now, offsetLeft }: { now: Date; offsetLeft?: string }) {
  const top = (now.getHours() + now.getMinutes() / 60) * 56;
  return (
    <div className="absolute right-0 z-20 pointer-events-none" style={{ top: `${top}px`, left: offsetLeft || "0px" }}>
      <div className="relative w-full border-t-2 border-red-500">
        <div className="absolute -left-1.5 -top-[5px] h-2.5 w-2.5 rounded-full bg-red-500" />
      </div>
    </div>
  );
}

/* ──── Overlap layout helper ──── */
interface LayoutedTask {
  task: Task;
  startHour: number;
  endHour: number;
  columnIndex: number;
  totalColumns: number;
}

function getTaskTimeRange(t: Task): { startHour: number; endHour: number } {
  const start = toDisplayDate(t.start_date) || toDisplayDate(t.due_date);
  if (!start) return { startHour: 0, endHour: 1 };
  const startHour = start.getHours() + start.getMinutes() / 60;
  if (!t.start_date || !t.due_date) return { startHour, endHour: startHour + 1 };
  const end = toDisplayDate(t.due_date)!;
  const endHour = end.getHours() + end.getMinutes() / 60;
  return { startHour, endHour: Math.max(endHour, startHour + 0.5) };
}

function layoutOverlappingTasks(dayTasks: Task[]): LayoutedTask[] {
  if (dayTasks.length === 0) return [];
  const items = dayTasks.map(task => ({ task, ...getTaskTimeRange(task) }));
  items.sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour);

  const clusters: typeof items[] = [];
  for (const item of items) {
    let placed = false;
    for (const cluster of clusters) {
      if (cluster.some(c => item.startHour < c.endHour && item.endHour > c.startHour)) {
        cluster.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([item]);
  }

  const result: LayoutedTask[] = [];
  for (const cluster of clusters) {
    const columns: typeof items[] = [];
    for (const item of cluster) {
      let placed = false;
      for (let ci = 0; ci < columns.length; ci++) {
        if (columns[ci].every(c => item.startHour >= c.endHour || item.endHour <= c.startHour)) {
          columns[ci].push(item);
          result.push({ ...item, columnIndex: ci, totalColumns: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
        result.push({ ...item, columnIndex: columns.length - 1, totalColumns: 0 });
      }
    }
    const total = columns.length;
    for (const r of result) {
      if (cluster.some(c => c.task.id === r.task.id)) r.totalColumns = total;
    }
  }
  return result;
}

interface TaskCalendarProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function TaskCalendar({ tasks, onTaskClick }: TaskCalendarProps) {
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const goToday = () => setCurrentDate(new Date());

  const goPrev = () => {
    if (view === "month") setCurrentDate(d => subMonths(d, 1));
    else if (view === "week") setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => addDays(d, -1));
  };

  const goNext = () => {
    if (view === "month") setCurrentDate(d => addMonths(d, 1));
    else if (view === "week") setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addDays(d, 1));
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, "dd MMM", { locale: ptBR })} – ${format(we, "dd MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR });
  }, [currentDate, view]);

  const viewLabels: Record<CalendarView, string> = { month: "Mês", week: "Semana", day: "Dia" };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="mx-1 text-sm font-semibold capitalize min-w-[160px] text-center">{headerLabel}</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex rounded-full border bg-muted/50 p-0.5">
          {(["month", "week", "day"] as CalendarView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {viewLabels[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="bg-card">
        {view === "month" && <MonthView currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} onDayClick={(d) => { setCurrentDate(d); setView("day"); }} />}
        {view === "week" && <WeekView currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} />}
        {view === "day" && <DayView currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} />}
      </div>
    </Card>
  );
}

/* ──── Month View ──── */
function MonthView({ currentDate, tasks, onTaskClick, onDayClick }: { currentDate: Date; tasks: Task[]; onTaskClick: (t: Task) => void; onDayClick: (d: Date) => void }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const today = new Date();

  const getTasksForDay = (day: Date) =>
    tasks.filter(t => {
      const start = toDisplayDate(t.start_date);
      const end = toDisplayDate(t.due_date);
      if (start && end) return day >= new Date(start.toDateString()) && day <= new Date(end.toDateString());
      if (end) return isSameDay(day, end);
      if (start) return isSameDay(day, start);
      return false;
    });

  return (
    <div>
      <div className="grid grid-cols-7 border-b">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
          <div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, today);
          const dayTasks = getTasksForDay(day);

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`min-h-[72px] cursor-pointer border-b border-r p-1 transition-colors hover:bg-accent/50 ${
                !isCurrentMonth ? "bg-muted/30" : ""
              } ${isToday ? "border-primary bg-primary/5" : ""}`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium ${
                isToday ? "bg-primary text-primary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"
              }`}>
                {day.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayTasks.slice(0, 2).map(t => {
                  const c = statusCalendarColors[t.status] || statusCalendarColors.pending;
                  return (
                    <div
                      key={t.id}
                      onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-medium border cursor-pointer ${c.bg} ${c.border} ${c.text}`}
                    >
                      {t.title}
                    </div>
                  );
                })}
                {dayTasks.length > 2 && (
                  <span className="text-[10px] text-muted-foreground pl-1">+{dayTasks.length - 2} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──── Week View ──── */
function WeekView({ currentDate, tasks, onTaskClick }: { currentDate: Date; tasks: Task[]; onTaskClick: (t: Task) => void }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const now = useCurrentTime();
  const today = new Date();

  const getTaskDurationHours = (t: Task) => {
    if (!t.start_date || !t.due_date) return 1;
    const diff = (new Date(t.due_date).getTime() - new Date(t.start_date).getTime()) / (1000 * 60 * 60);
    return Math.max(1, Math.min(diff, 12));
  };

  const dayLayouts = useMemo(() => {
    const map = new Map<number, LayoutedTask[]>();
    weekDays.forEach((day, i) => {
      const dayTasks = tasks.filter(t => {
        const start = toDisplayDate(t.start_date);
        const end = toDisplayDate(t.due_date);
        if (start && end) {
          return isSameDay(start, day) || isSameDay(end, day) ||
            (day >= new Date(start.toDateString()) && day <= new Date(end.toDateString()));
        }
        if (start) return isSameDay(start, day);
        if (end) return isSameDay(end, day);
        return false;
      });
      map.set(i, layoutOverlappingTasks(dayTasks));
    });
    return map;
  }, [tasks, weekStart.getTime()]);

  return (
    <div className="overflow-auto max-h-[600px]">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-card z-10">
        <div className="border-r" />
        {weekDays.map((day, i) => (
          <div key={i} className={`px-2 py-2 text-center border-r ${isSameDay(day, today) ? "bg-primary/5" : ""}`}>
            <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</div>
            <div className={`text-sm font-semibold ${isSameDay(day, today) ? "text-primary" : ""}`}>{day.getDate()}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
        {HOURS.map(hour => (
          <div key={hour} className="contents">
            <div className="border-r border-b border-dashed px-2 py-1 text-right text-xs text-muted-foreground h-14 flex items-start justify-end pt-1">
              {String(hour).padStart(2, "0")}:00
            </div>
            {weekDays.map((day, di) => {
              const layouted = (dayLayouts.get(di) || []).filter(lt => Math.floor(lt.startHour) === hour);
              return (
                <div key={di} className={`border-r border-b border-dashed h-14 relative ${isSameDay(day, today) ? "bg-primary/5" : ""}`}>
                  {hour === 0 && isSameDay(day, now) && <CurrentTimeLine now={now} />}
                  {layouted.map(lt => {
                    const c = statusCalendarColors[lt.task.status] || statusCalendarColors.pending;
                    const durationHours = getTaskDurationHours(lt.task);
                    const w = `calc((100% - 4px) / ${lt.totalColumns})`;
                    const l = `calc(${lt.columnIndex} * (100% - 4px) / ${lt.totalColumns} + 2px)`;
                    return (
                      <div
                        key={lt.task.id}
                        onClick={() => onTaskClick(lt.task)}
                        className={`absolute rounded-lg shadow-sm border px-1 py-0.5 text-[11px] font-medium cursor-pointer overflow-hidden z-[1] ${c.bg} ${c.border} ${c.text}`}
                        style={{ height: `${durationHours * 56 - 4}px`, top: "2px", width: w, left: l }}
                      >
                        <div className="truncate">{lt.task.title}</div>
                        {durationHours > 1 && lt.task.start_date && (
                          <div className="text-[10px] opacity-70">{formatStoredDate(lt.task.start_date, "time")} - {lt.task.due_date ? formatStoredDate(lt.task.due_date, "time") : ""}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──── Day View ──── */
function DayView({ currentDate, tasks, onTaskClick }: { currentDate: Date; tasks: Task[]; onTaskClick: (t: Task) => void }) {
  const now = useCurrentTime();
  const isToday = isSameDay(currentDate, now);

  const getTaskDurationHours = (t: Task) => {
    if (!t.start_date || !t.due_date) return 1;
    const diff = (new Date(t.due_date).getTime() - new Date(t.start_date).getTime()) / (1000 * 60 * 60);
    return Math.max(1, Math.min(diff, 12));
  };

  const layouted = useMemo(() => {
    const dayTasks = tasks.filter(t => {
      const start = toDisplayDate(t.start_date);
      const end = toDisplayDate(t.due_date);
      if (start && end) {
        return isSameDay(start, currentDate) || isSameDay(end, currentDate) ||
          (currentDate >= new Date(start.toDateString()) && currentDate <= new Date(end.toDateString()));
      }
      if (start) return isSameDay(start, currentDate);
      if (end) return isSameDay(end, currentDate);
      return false;
    });
    return layoutOverlappingTasks(dayTasks);
  }, [tasks, currentDate.toDateString()]);

  return (
    <div className="overflow-auto max-h-[600px] relative">
      {isToday && <CurrentTimeLine now={now} offsetLeft="60px" />}
      {HOURS.map(hour => {
        const hourTasks = layouted.filter(lt => Math.floor(lt.startHour) === hour);
        return (
          <div key={hour} className="grid grid-cols-[60px_1fr] border-b border-dashed">
            <div className="border-r px-2 py-1 text-right text-xs text-muted-foreground h-14 flex items-start justify-end pt-1">
              {String(hour).padStart(2, "0")}:00
            </div>
            <div className="h-14 relative">
              {hourTasks.map(lt => {
                const c = statusCalendarColors[lt.task.status] || statusCalendarColors.pending;
                const durationHours = getTaskDurationHours(lt.task);
                const w = `calc((100% - 4px) / ${lt.totalColumns})`;
                const l = `calc(${lt.columnIndex} * (100% - 4px) / ${lt.totalColumns} + 2px)`;
                return (
                  <div
                    key={lt.task.id}
                    onClick={() => onTaskClick(lt.task)}
                    className={`absolute rounded-lg shadow-sm border px-2 py-1 text-xs font-medium cursor-pointer overflow-hidden z-[1] ${c.bg} ${c.border} ${c.text}`}
                    style={{ height: `${durationHours * 56 - 4}px`, top: "2px", width: w, left: l }}
                  >
                    <div className="truncate font-semibold">{lt.task.title}</div>
                    {lt.task.start_date && (
                      <div className="text-[10px] opacity-70">{formatStoredDate(lt.task.start_date, "time")} - {lt.task.due_date ? formatStoredDate(lt.task.due_date, "time") : ""}</div>
                    )}
                    {lt.task.description && durationHours >= 2 && <div className="truncate text-[10px] opacity-60 mt-0.5">{lt.task.description}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
