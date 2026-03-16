

## Diagnóstico: Geração recorrente via drag-and-drop

### O que está acontecendo

A geração **ESTÁ funcionando**. Os logs da Edge Function confirmam:
- Boot às 13:52:24 (1s após o PATCH de `completed`)
- Tarefa criada: "teste drag and drop — start: 2026-03-17T13:51:00.000Z"

O problema é que a nova tarefa tem `start_date` de **amanhã** (17/03), mas o filtro de data do Kanban está fixo em **hoje** (16/03). A tarefa é criada no banco mas **filtrada da visualização**.

### Causa raiz

```text
Tarefa concluída (16/03) → Edge Function gera próxima (17/03) → fetchTasks() carrega → filtro de data (hoje) → tarefa não aparece
```

Código do filtro (linha 154-163 de Tasks.tsx):
```typescript
if (filterDate && viewMode !== "calendar") {
  // filtra por start_date/due_date do dia selecionado
  if (!matchesDate) return false;
}
```

### Correção

**`src/pages/Tasks.tsx`** — Duas mudanças:

1. **Limpar o filtro de data após gerar recorrência**, para que a nova tarefa apareça imediatamente:

```typescript
if (generatedRecurring) {
  setFilterDate(undefined); // remove filtro de data para mostrar a nova tarefa
  toast({ title: "Status atualizado! Próxima recorrência gerada." });
} else {
  toast({ title: "Status atualizado!" });
}
await fetchTasks();
```

2. **Adicionar opção "Todos os dias" no filtro de data** para que o usuário possa facilmente ver todas as tarefas independente da data.

### Arquivos alterados
- `src/pages/Tasks.tsx` — limpar filtro de data ao gerar recorrência + toast informativo

