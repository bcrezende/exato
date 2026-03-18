import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTodo, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface KpiCardsProps {
  todayTotal: number;
  todayInProgress: number;
  todayCompleted: number;
  overdueCount: number;
  todayProgress: number;
}

export default function KpiCards({
  todayTotal,
  todayInProgress,
  todayCompleted,
  overdueCount,
  todayProgress,
}: KpiCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">Tarefas Hoje</CardTitle>
          <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-xl font-bold">{todayTotal}</div>
          <p className="text-[11px] text-muted-foreground">{todayProgress}% concluídas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">Em Andamento</CardTitle>
          <Clock className="h-3.5 w-3.5 text-primary" />
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-xl font-bold">{todayInProgress}</div>
          <p className="text-[11px] text-muted-foreground">sendo executadas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">Concluídas</CardTitle>
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-xl font-bold">{todayCompleted}</div>
          <p className="text-[11px] text-muted-foreground">de {todayTotal} do dia</p>
        </CardContent>
      </Card>

      <Card className={overdueCount > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">Atrasadas</CardTitle>
          <AlertTriangle className={`h-3.5 w-3.5 ${overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className={`text-xl font-bold ${overdueCount > 0 ? "text-destructive" : ""}`}>{overdueCount}</div>
          <p className="text-[11px] text-muted-foreground">requerem atenção</p>
        </CardContent>
      </Card>
    </div>
  );
}
