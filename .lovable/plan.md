

## Correção: Edição de tarefa recorrente mostra "Nenhuma"

### Problema

Quando uma tarefa recorrente é concluída, o sistema gera uma instância filha com `recurrence_type: "none"` e `recurrence_parent_id` apontando para a tarefa pai. Ao editar essa instância, `getInitialForm` lê diretamente `task.recurrence_type` ("none") sem resolver o tipo real do pai.

O `TaskDetailModal` já resolve isso corretamente com `effectiveRecurrenceType`, mas o `TaskForm` não.

### Correção

**Arquivo:** `src/components/tasks/TaskForm.tsx`

1. Na função `getInitialForm`, quando a task tem `recurrence_parent_id` e `recurrence_type === "none"`, manter "none" no form (comportamento correto para instâncias filhas que não devem alterar a recorrência do ciclo).

**Porém**, o problema real pode ser outro: tarefas **pai** (que definem o ciclo) também estão aparecendo como "none"? Preciso verificar os dados.

Olhando os dados do banco na network request, vejo que as tarefas pai como "CARTA FRETE" têm `recurrence_type: "daily"` e as filhas têm `recurrence_type: "none"` com `recurrence_parent_id` preenchido.

**A correção correta é:** ao abrir o form para edição de uma instância filha, resolver o `recurrence_type` do pai para exibir corretamente.

### Implementação

**Arquivo:** `src/components/tasks/TaskForm.tsx`

1. Adicionar um `useEffect` que, quando `editing` tem `recurrence_parent_id` e `recurrence_type === "none"`, busca o `recurrence_type` do pai no banco e atualiza o campo `recurrence_type` do form.

2. Isso replica a mesma lógica já usada no `TaskDetailModal` (linhas que buscam `parentRecurrenceType`).

### Mudança concreta

```typescript
// Novo useEffect após o existente na linha 84-89
useEffect(() => {
  if (open && editing && editing.recurrence_type === "none" && editing.recurrence_parent_id) {
    supabase
      .from("tasks")
      .select("recurrence_type")
      .eq("id", editing.recurrence_parent_id)
      .single()
      .then(({ data }) => {
        if (data?.recurrence_type && data.recurrence_type !== "none") {
          setForm(prev => ({ ...prev, recurrence_type: data.recurrence_type }));
        }
      });
  }
}, [open, editing]);
```

### Impacto

- Instâncias filhas de recorrência exibem o tipo correto no form de edição
- Tarefas sem recorrência continuam mostrando "Nenhuma"
- Nenhuma mudança no fluxo de salvamento

