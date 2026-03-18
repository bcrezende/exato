

## Reestruturar TaskCalendar.tsx

### Alterações no arquivo `src/components/tasks/TaskCalendar.tsx`

**1. Header Compacto**
- Reorganizar: `[Hoje]` à esquerda → `[< ] Março 2026 [>]` no centro → pills `[Mês | Semana | Dia]` à direita
- Pills usando classes `rounded-full` com bg sutil para ativo
- Navegação `<` `>` colada ao título do mês

**2. Cores de Status Atualizadas**
```
pending:     bg-amber-50    border-amber-200    text-amber-700
in_progress: bg-blue-50     border-blue-200     text-blue-700
completed:   bg-emerald-50  border-emerald-200  text-emerald-700
cancelled:   bg-red-50      border-red-200      text-red-700
overdue:     bg-red-50      border-red-300      text-red-800
```

**3. Month View**
- `min-h-[100px]` → `min-h-[72px]`
- Limitar a 2 tarefas visíveis (`slice(0, 2)`) + indicador `+N`
- Dia atual: adicionar `border border-primary bg-primary/5` na célula
- Tarefas: `truncate` já existe, manter single-line

**4. Week/Day Views**
- Linhas de hora: adicionar `border-dashed` no `border-b` das células
- Cards de tarefa: adicionar `rounded-lg shadow-sm` (atualizar de `rounded` para `rounded-lg`)
- Linha vermelha de hora atual já existe — manter

