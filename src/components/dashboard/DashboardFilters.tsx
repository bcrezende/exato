import { Building2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

interface DashboardFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string }[];
  employeeOptions: { id: string; full_name: string | null }[];
  selectedDepartment: string | null;
  selectedEmployee: string | null;
  onDepartmentChange: (value: string | null) => void;
  onEmployeeChange: (value: string | null) => void;
  role: string | null;
}

export default function DashboardFilters({
  open,
  onOpenChange,
  departments,
  employeeOptions,
  selectedDepartment,
  selectedEmployee,
  onDepartmentChange,
  onEmployeeChange,
  role,
}: DashboardFiltersProps) {
  const canChangeDepartment = role === "admin";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:w-[360px]">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Setor
            </label>
            <Select
              value={selectedDepartment ?? "all"}
              onValueChange={(v) => {
                onDepartmentChange(v === "all" ? null : v);
                onEmployeeChange(null);
              }}
              disabled={!canChangeDepartment}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os setores" />
              </SelectTrigger>
              <SelectContent>
                {role === "admin" && <SelectItem value="all">Todos os setores</SelectItem>}
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Analista
            </label>
            <Select
              value={selectedEmployee ?? "all"}
              onValueChange={(v) => onEmployeeChange(v === "all" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os analistas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os analistas</SelectItem>
                {employeeOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              if (canChangeDepartment) onDepartmentChange(null);
              onEmployeeChange(null);
            }}
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
