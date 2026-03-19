import { Building2, User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardFiltersProps {
  departments: { id: string; name: string }[];
  employeeOptions: { id: string; full_name: string | null }[];
  selectedDepartment: string | null;
  selectedEmployee: string | null;
  onDepartmentChange: (value: string | null) => void;
  onEmployeeChange: (value: string | null) => void;
  role: string | null;
}

export default function DashboardFilters({
  departments,
  employeeOptions,
  selectedDepartment,
  selectedEmployee,
  onDepartmentChange,
  onEmployeeChange,
  role,
}: DashboardFiltersProps) {
  const canChangeDepartment = role === "admin";
  const selectedDeptName = departments.find(d => d.id === selectedDepartment)?.name;
  const selectedEmpName = employeeOptions.find(p => p.id === selectedEmployee)?.full_name;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {canChangeDepartment && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <Select
              value={selectedDepartment ?? "all"}
              onValueChange={(v) => {
                onDepartmentChange(v === "all" ? null : v);
                onEmployeeChange(null);
              }}
            >
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Todos os setores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={selectedEmployee ?? "all"}
            onValueChange={(v) => onEmployeeChange(v === "all" ? null : v)}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
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

      {/* Active filter chips */}
      {(selectedDepartment || selectedEmployee) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedDepartment && canChangeDepartment && (
            <Badge variant="secondary" className="gap-1 text-xs pr-1">
              <Building2 className="h-3 w-3" />
              {selectedDeptName}
              <button
                onClick={() => { onDepartmentChange(null); onEmployeeChange(null); }}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedEmployee && (
            <Badge variant="secondary" className="gap-1 text-xs pr-1">
              <User className="h-3 w-3" />
              {selectedEmpName || "Sem nome"}
              <button
                onClick={() => onEmployeeChange(null)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
