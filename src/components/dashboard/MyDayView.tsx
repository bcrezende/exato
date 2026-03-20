import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle, Clock, ListTodo, AlertTriangle, PartyPopper } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { updateTaskStatus, generateNextRecurrence } from "@/lib/task-utils";
import { MyDaySkeleton } from "@/components/skeletons/MyDaySkeleton";
import { usePendingTasksCheck } from "@/hooks/usePendingTasksCheck";
import PendingTasksAlert from "@/components/tasks/PendingTasksAlert";
import RecurrenceConfirmDialog from "@/components/tasks/RecurrenceConfirmDialog";
import { useRecurrenceDefinitions } from "@/hooks/useRecurrenceDefinitions";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

function formatTime(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
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
  const { checkBeforeStart, pendingTasks, isAlertOpen, closeAlert, proceedAction } = usePendingTasksCheck();
  const { definitions } = useRecurrenceDefinitions();
  const [showRecurrenceConfirm, setShowRecurrenceConfirm] = useState(false);
  const [pendingRecurrence, setPendingRecurrence] = useState<{ parentId: string; recurrenceType: string } | null>(null);

  const fetchTasks = async () => {
    if (!user) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayStart = `${y}-${m}-${d}T00:00:00+00:00`;
    const todayEnd = `${y}-${m}-${d}T23:59:59.999+00:00`;
    const { data } = await supabase
      .from("tasks")
      .select("id,title,status,priority,due_date,start_date,assigned_to,department_id,recurrence_type,estimated_minutes,created_by,created_at,recurrence_parent_id,justification,difficulty_rating,updated_at,description")
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

  const executeStatusChange = async (taskId: string, newStatus: "in_progress" | "completed") => {
    const task = tasks.find((t) => t.id === taskId);
    const previousTasks = tasks;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    if (newStatus === "in_progress") {
      setHighlightedId(taskId);
      setTimeout(() => setHighlightedId(null), 800);
    } else {
      setSuccessId(taskId);
      setTimeout(() => setSuccessId(null), 1500);
    }
    toast.success(newStatus === "in_progress" ? "Tarefa iniciada!" : "Tarefa concluída!");

    try {
      const { isRecurring, parentId } = await updateTaskStatus(taskId, newStatus, task);
      if (isRecurring && parentId) {
        const effectiveType = task?.recurrence_type && task.recurrence_type !== "none"
          ? task.recurrence_type
          : tasks.find(t => t.id === task?.recurrence_parent_id)?.recurrence_type || "none";
        setPendingRecurrence({ parentId, recurrenceType: effectiveType });
        setShowRecurrenceConfirm(true);
      }
    } catch {
      setTasks(previousTasks);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleStatusChange = (taskId: string, newStatus: "in_progress" | "completed") => {
    if (newStatus === "in_progress") {
      checkBeforeStart(taskId, () => executeStatusChange(taskId, newStatus));
    } else {
      executeStatusChange(taskId, newStatus);
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

  const allCompleted = tasks.length > 0 && stats.completed === tasks.length;

  if (loading) {
    return <MyDaySkeleton />;
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

      {allCompleted ? (
        <Card className="animate-scale-in border-success/30 bg-success/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center relative overflow-hidden">
            <ConfettiCanvas />
            <PartyPopper className="h-12 w-12 text-success mb-3 animate-scale-in" />
            <h3 className="font-semibold text-lg">Parabéns! Todas as tarefas concluídas! 🎉</h3>
            <p className="text-sm text-muted-foreground">Excelente trabalho hoje!</p>
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
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
              } ${successId === task.id ? "animate-highlight-success animate-pulse-success border-2 border-success/50" : ""}`}
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
      <PendingTasksAlert
        open={isAlertOpen}
        tasks={pendingTasks}
        onClose={closeAlert}
        onProceed={() => proceedAction?.()}
      />
      <RecurrenceConfirmDialog
        open={showRecurrenceConfirm}
        recurrenceType={pendingRecurrence?.recurrenceType || ""}
        definitions={definitions}
        onConfirm={async () => {
          setShowRecurrenceConfirm(false);
          if (pendingRecurrence?.parentId) {
            try {
              await generateNextRecurrence(pendingRecurrence.parentId);
              toast.success("Próxima tarefa gerada!");
              fetchTasks();
            } catch {
              toast.error("Erro ao gerar próxima tarefa");
            }
          }
          setPendingRecurrence(null);
        }}
        onCancel={() => {
          setShowRecurrenceConfirm(false);
          setPendingRecurrence(null);
        }}
      />
    </div>
  );
}

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = [
      "hsl(142, 71%, 45%)", // success
      "hsl(221, 83%, 53%)", // primary
      "hsl(38, 92%, 50%)",  // warning
      "hsl(280, 65%, 60%)", // purple
      "hsl(350, 80%, 55%)", // pink
    ];

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * canvas.height * 0.5,
      w: 4 + Math.random() * 6,
      h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    }));

    let animationId: number;
    const start = performance.now();
    const duration = 3000;

    const animate = (now: number) => {
      const elapsed = now - start;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fade = elapsed > duration * 0.7 ? 1 - (elapsed - duration * 0.7) / (duration * 0.3) : 1;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
