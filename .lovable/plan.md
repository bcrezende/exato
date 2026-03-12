

## Plano: Filtro por Departamento no Dashboard

### Alteração

**`src/pages/Dashboard.tsx`** — Adicionar um seletor de departamento no header do dashboard:

1. **Fetch de departamentos** — Adicionar busca de `departments` no `useEffect` existente (já em paralelo com tasks e profiles)
2. **State `selectedDepartment`** — `string | null`, onde `null` = "Todos os setores"
3. **Select dropdown** no header (ao lado dos botões Kanban/Calendário) usando o componente `Select` existente
4. **Filtro aplicado** — Criar um `filteredTasks` via `useMemo` que filtra `tasks` por `department_id` quando um departamento é selecionado. Todas as seções (stats, atrasadas, hoje, próximos dias, kanban, calendário) passam a usar `filteredTasks` em vez de `tasks`
5. **Para gerentes** — Pré-selecionar o departamento do gerente (já restrito pelo RLS, mas visualmente consistente)

### Componentes reutilizados
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` de `@/components/ui/select`
- `Building2` icon do lucide (já importado no sidebar)

### Escopo
- Apenas `src/pages/Dashboard.tsx` será alterado
- Nenhuma mudança no banco de dados

