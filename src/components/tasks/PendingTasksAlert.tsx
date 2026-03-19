import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AlertTriangle, Eye, ArrowRight } from "lucide-react";
import { formatStoredDate } from "@/lib/date-utils";
import type { PendingTask } from "@/hooks/usePendingTasksCheck";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  overdue: "Atrasada",
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  overdue: "bg-destructive/10 text-destructive",
};

interface PendingTasksAlertProps {
  open: boolean;
  tasks: PendingTask[];
  onClose: () => void;
  onProceed: () => void;
}

export default function PendingTasksAlert({ open, tasks, onClose, onProceed }: PendingTasksAlertProps) {
  const navigate = useNavigate();

  const handleViewTasks = () => {
    onClose();
    navigate("/tasks");
  };

  const handleProceed = () => {
    onClose();
    onProceed();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Atenção: Tarefas Pendentes
          </DialogTitle>
          <DialogDescription>
            Você possui tarefas atrasadas ou pendentes de dias anteriores.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[280px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Data Prevista</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{task.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatStoredDate(task.due_date || task.start_date, "short-date")}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[task.status] || ""}>
                      {statusLabels[task.status] || task.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleViewTasks}>
            <Eye className="mr-2 h-4 w-4" /> Ver Tarefas
          </Button>
          <Button onClick={handleProceed}>
            <ArrowRight className="mr-2 h-4 w-4" /> Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
