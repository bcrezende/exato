

## Tarefa não aparece como "Atrasada" no /tasks — Diagnóstico

### Causa raiz

A lógica do Kanban em `Tasks.tsx` (linha 439) usa **comparação apenas por data** para decidir se uma tarefa pendente é "atrasada":

```typescript
t.due_date.split("T")[0] < todayDateStr()
```

Isso significa: a tarefa só aparece na coluna "Atrasada" se o **dia** do `due_date` for **anterior a hoje**. Se a tarefa vence **hoje** às 14:30 e agora são 15:00, ela **não** aparece como atrasada porque `"2026-03-27" < "2026-03-27"` é `false`.

O mesmo problema existe na visão de Lista (linha 300 do drag-and-drop) e no filtro de status.

### Solução

Trocar a comparação de data-only para comparação completa com horário, usando `nowAsFakeUTC()` (que já é usado nos dashboards para essa mesma lógica):

**Antes:**
```typescript
t.due_date.split("T")[0] < todayDateStr()
```

**Depois:**
```typescript
t.due_date < nowAsFakeUTC()
```

Isso faz a tarefa ir para "Atrasada" assim que o horário de vencimento passar, não apenas no dia seguinte.

### Pontos de correção em `src/pages/Tasks.tsx`

| Linha | Contexto | Mudança |
|---|---|---|
| 439 | Kanban: filtro coluna overdue | `due_date < nowAsFakeUTC()` |
| 440 | Kanban: filtro coluna pending (exclusão) | mesma lógica invertida |
| 300 | Drag-and-drop: `currentEffective` | mesma correção |

Importar `nowAsFakeUTC` de `@/lib/date-utils` (já importa `todayDateStr` e `toDisplayDate`).

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `src/pages/Tasks.tsx` | Usar `nowAsFakeUTC()` em vez de comparação por data para classificar tarefas como atrasadas |

