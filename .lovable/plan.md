

## Adicionar indicador de justificativa nas tarefas

### O que será feito

Adicionar um pequeno ícone/badge chamativo no canto superior direito dos cards de tarefa que possuem o campo `justification` preenchido, nas três visualizações: Kanban, Lista e Calendário.

### Mudanças

**1. `src/pages/Tasks.tsx`**

- **Kanban**: No card (dentro de `<CardContent>`), adicionar um ícone `AlertTriangle` (ou `MessageSquareWarning`) amarelo/laranja posicionado `absolute top-1 right-1` quando `task.justification` existir. Envolver `<Card>` com `relative` para posicionamento.
- **Lista**: Adicionar uma coluna "Just." ou inserir um ícone ao lado do título da tarefa quando houver justificativa. Opção mais limpa: colocar o ícone inline ao lado do título.

**2. `src/components/tasks/TaskCalendar.tsx`**

- **MonthView**: No mini-card de tarefa do dia, adicionar um pequeno dot/ícone quando `t.justification` existir.
- **WeekView / DayView**: Nos cards de tarefa posicionados no grid horário, adicionar o mesmo ícone `absolute top-0.5 right-0.5`.

### Detalhes técnicos

Ícone escolhido: `AlertTriangle` do lucide-react, tamanho pequeno (h-3 w-3), cor `text-amber-500`, com tooltip "Possui justificativa".

**Kanban** — envolver Card com `relative`, adicionar:
```tsx
{task.justification && (
  <div className="absolute -top-1 -right-1 bg-amber-100 border border-amber-300 rounded-full p-0.5 z-10" title="Possui justificativa">
    <AlertTriangle className="h-3 w-3 text-amber-600" />
  </div>
)}
```

**Lista** — adicionar ícone inline ao lado do título:
```tsx
<div className="flex items-center gap-1 truncate max-w-[300px]">
  {task.title}
  {task.justification && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" title="Possui justificativa" />}
</div>
```

**Calendário (Month/Week/Day)** — adicionar nos cards de tarefa:
```tsx
{t.justification && <AlertTriangle className="h-2.5 w-2.5 text-amber-500 inline ml-0.5 shrink-0" />}
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/Tasks.tsx` | Badge no kanban card + ícone na lista |
| `src/components/tasks/TaskCalendar.tsx` | Ícone nos cards do mês, semana e dia |

