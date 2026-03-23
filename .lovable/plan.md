

## Calendários em PT-BR

### Problema
O componente `Calendar` (react-day-picker) exibe meses e dias da semana em inglês por padrão.

### Solução
Adicionar `locale={ptBR}` do `date-fns` como default no componente `Calendar`. Isso traduz automaticamente todos os calendários do projeto (date pickers no AdminDashboard, TaskForm, AIAnalysisDialog, etc.).

### Arquivo

**`src/components/ui/calendar.tsx`**
- Importar `ptBR` de `date-fns/locale`
- Passar `locale={ptBR}` como prop default no `DayPicker`, permitindo override via props

```tsx
import { ptBR } from "date-fns/locale";

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      // ... rest unchanged
      {...props}
    />
  );
}
```

Uma única mudança, um único arquivo. Todos os calendários do projeto passam a exibir em português.

