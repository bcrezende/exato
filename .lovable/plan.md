

## Classificar tarefas como "Atrasada" quando o horário de início passa

### Problema

No Kanban do `/tasks`, uma tarefa só vai para "Atrasada" quando o `due_date` (prazo final) passa. Se o `start_date` já passou e a tarefa continua `pending`, ela permanece na coluna "Pendente" até o prazo final vencer.

### Solução

Adicionar verificação do `start_date` na lógica de classificação: se a tarefa está `pending` e o `start_date` já passou, ela deve aparecer como "Atrasada" (consistente com a lógica dos dashboards).

### Mudança em `src/pages/Tasks.tsx`

Trocar a condição de overdue de:
```typescript
t.due_date && t.due_date < nowAsFakeUTC() && t.status === "pending"
```

Para:
```typescript
t.status === "pending" && (
  (t.due_date && t.due_date < nowAsFakeUTC()) ||
  (t.start_date && t.start_date < nowAsFakeUTC())
)
```

Aplicar nos 3 pontos:
- Linha 439: filtro coluna overdue
- Linha 440: filtro coluna pending (exclusão inversa)
- Linha 300: drag-and-drop `currentEffective`

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `src/pages/Tasks.tsx` | Incluir `start_date` na lógica de classificação de tarefas atrasadas |

