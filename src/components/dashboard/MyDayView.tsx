import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle, Clock, ListTodo, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { updateTaskStatus } from "@/lib/task-utils";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

function formatTime(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return format(d, "HH:mm");
}

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(progress * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span className="animate-count-up">{display}</span>;
}

export default function MyDayView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!user) return;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", user.id)
      .or(`status.eq.overdue,and(start_date.gte.${todayStart},start_date.lte.${todayEnd}),and(due_date.gte.${todayStart},due_date.lte.${todayEnd})`)
      .order("start_date", { ascending: true, nullsFirst: false });
    if (data) {
      data.sort((a, b) => {
        if (a.status === "overdue" && b.status !== "overdue") return -1;
        if (a.status !== "overdue" && b.status === "overdue") return 1;
        return 0;
      });
    }
    if (data) setTasks(data);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [user]);

  const handleStatusChange = async (taskId: string, newStatus: "in_progress" | "completed") => {
    const task = tasks.find((t) => t.id === taskId);
    try {
      const { generatedRecurring } = await updateTaskStatus(taskId, newStatus, task);
      
      if (newStatus === "in_progress") {
        setHighlightedId(taskId);
        setTimeout(() => setHighlightedId(null), 800);
      } else {
        setSuccessId(taskId);
        setTimeout(() => setSuccessId(null), 1500);
      }
      
      toast.success(newStatus === "in_progress" ? "Tarefa iniciada!" : "Tarefa concluída!");
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      if (generatedRecurring) fetchTasks();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const stats = {
    overdue: tasks.filter((t) => t.status === "overdue").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const today = new Date();
  const formattedDate = format(today, "EEEE, dd 'de' MMMM", { locale: ptBR });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">Meu Dia</h1>
        <p className="text-muted-foreground capitalize">{formattedDate}</p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 stagger-fade-in">
        <Card className="hover-lift">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-destructive/10 p-2"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold"><AnimatedCounter value={stats.overdue} /></p>
              <p className="text-xs text-muted-foreground">Atrasadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-warning/10 p-2"><Clock className="h-4 w-4 text-warning" /></div>
            <div>
              <p className="text-2xl font-bold"><AnimatedCounter value={stats.pending} /></p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/10 p-2"><Play className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold"><AnimatedCounter value={stats.inProgress} /></p>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-success/10 p-2"><CheckCircle className="h-4 w-4 text-success" /></div>
            <div>
              <p className="text-2xl font-bold"><AnimatedCounter value={stats.completed} /></p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <Card className="animate-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ListTodo className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-lg">Nenhuma tarefa para hoje</h3>
            <p className="text-sm text-muted-foreground">Aproveite o dia! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 stagger-fade-in">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={`transition-all hover-lift ${task.status === "completed" ? "opacity-60" : ""} ${
                highlightedId === task.id ? "animate-highlight-flash" : ""
              } ${successId === task.id ? "animate-highlight-success animate-pulse-success" : ""}`}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="hidden sm:flex flex-col items-center text-xs text-muted-foreground min-w-[80px]">
                  {formatTime(task.start_date) && <span className="font-medium">{formatTime(task.start_date)}</span>}
                  {formatTime(task.start_date) && formatTime(task.due_date) && <span>→</span>}
                  {formatTime(task.due_date) && <span className="font-medium">{formatTime(task.due_date)}</span>}
                  {!formatTime(task.start_date) && !formatTime(task.due_date) && <span className="italic">Sem horário</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium leading-tight ${task.status === "completed" ? "line-through" : ""}`}>{task.title}</h4>
                  {task.description && <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{task.description}</p>}
                  <span className="sm:hidden text-xs text-muted-foreground mt-1 block">
                    {formatTime(task.start_date) || "Sem horário"}
                  </span>
                </div>
                <div className="flex-shrink-0">
                {(task.status === "pending" || task.status === "overdue") && (
                    <Button size="sm" variant={task.status === "overdue" ? "destructive" : "outline"} className="gap-1.5 hover-scale-subtle" onClick={() => handleStatusChange(task.id, "in_progress")}>
                      <Play className="h-3.5 w-3.5" /><span className="hidden sm:inline">Iniciar</span>
                    </Button>
                  )}
                  {task.status === "in_progress" && (
                    <Button size="sm" className="gap-1.5 hover-scale-subtle" onClick={() => handleStatusChange(task.id, "completed")}>
                      <CheckCircle className="h-3.5 w-3.5" /><span className="hidden sm:inline">Concluir</span>
                    </Button>
                  )}
                  {task.status === "completed" && (
                    <Badge variant="secondary" className="bg-success/10 text-success animate-scale-in">
                      <CheckCircle className="h-3 w-3 mr-1" />Concluída
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
