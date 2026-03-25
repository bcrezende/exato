

## Botão "Gerar próxima recorrência" na tarefa concluída

### O que será feito

Quando uma tarefa recorrente está com status `completed` e **não existe** uma próxima instância já gerada, exibir um botão "Gerar próxima" no `TaskDetailModal`. Isso permite que o usuário que recusou a geração automática possa fazê-lo depois.

### Lógica

1. No `TaskDetailModal`, quando a tarefa está `completed` e é recorrente, verificar se já existe uma tarefa filha com `recurrence_parent_id` apontando para o mesmo parent e `due_date` maior que a tarefa atual
2. Se **não existe** próxima instância → mostrar botão "Gerar próxima recorrência"
3. Ao clicar, abrir o `RecurrenceConfirmDialog` já existente e, ao confirmar, chamar `generateNextRecurrence`

### Mudanças

**`src/components/tasks/TaskDetailModal.tsx`**
- Adicionar um `useEffect` que, quando a tarefa é recorrente e `completed`, consulta se já existe próxima instância via query: `tasks` where `recurrence_parent_id = parentId` and `due_date > task.due_date` and `status != not_done`
- Guardar resultado em state `hasNextInstance` (boolean)
- No bloco onde mostra `Badge "Concluída"`, adicionar abaixo um botão `CalendarPlus` + "Gerar próxima" quando `isRecurring && !hasNextInstance`
- O botão abre o `RecurrenceConfirmDialog` já existente (reutiliza a mesma lógica de `pendingRecurrence`)

### Visual

```text
┌──────────────────────┐
│ ✅ Concluída         │
│ Para alterar, ...    │
│                      │
│ [📅 Gerar próxima]   │  ← novo botão, só aparece se não há próxima
└──────────────────────┘
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/tasks/TaskDetailModal.tsx` | Query de verificação + botão condicional |

Nenhuma mudança de banco necessária — apenas lógica de frontend.

