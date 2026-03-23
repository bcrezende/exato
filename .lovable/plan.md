

## Fix: Botão Editar no modal de tarefa do dashboard do analista

### Problema

No `AnalystDashboard.tsx`, o `TaskDetailModal` recebe:
- `onEdit={() => {}}` -- no-op, por isso nada acontece
- `members={[]}` e `departments={[]}` -- arrays vazios, sem dados para o formulário

### Correção

**Arquivo:** `src/pages/Dashboard/AnalystDashboard.tsx`

1. Adicionar estado `editingTask` e importar `TaskForm`
2. Buscar `members` (profiles) e `departments` no fetch inicial (o dashboard já pode ter acesso ao profile do próprio usuário, mas o TaskForm precisa das listas)
3. Passar `onEdit={(task) => { setSelectedTask(null); setEditingTask(task); }}` ao `TaskDetailModal`
4. Passar `members` e `departments` reais ao `TaskDetailModal`
5. Renderizar `<TaskForm>` com `editing={editingTask}` e `onSaved` que refaz fetch + fecha o form

### Mudanças concretas

- Adicionar `import TaskForm from "@/components/tasks/TaskForm"`
- Adicionar states: `editingTask`, `members`, `departments`
- No `useEffect` de fetch, buscar `profiles` e `departments` da company
- Atualizar props do `TaskDetailModal`: `members={members}`, `departments={departments}`, `onEdit={(t) => { setSelectedTask(null); setEditingTask(t); }}`
- Adicionar `<TaskForm open={!!editingTask} editing={editingTask} members={members} departments={departments} onSaved={...} onOpenChange={...} />`

