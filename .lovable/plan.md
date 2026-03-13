

## Plano: Desativar filtro de data na visão de calendário

### Problema
O filtro de data (padrão: hoje) filtra as tarefas antes de passá-las ao `TaskCalendar`. Como o calendário já tem navegação própria por mês/semana/dia, o filtro de data remove tarefas de outros dias, deixando o calendário vazio na maioria das datas.

### Solução

**`src/pages/Tasks.tsx`** — uma única alteração:

Na lógica do `filtered` (linha 123), pular o filtro de data quando `viewMode === "calendar"`:

```ts
if (filterDate && viewMode !== "calendar") {
  // ... filtro de data existente
}
```

Isso garante que:
- Kanban e Lista continuam filtrando por data normalmente
- Calendário recebe todas as tarefas (respeitando os demais filtros como status, setor, responsável)
- Nenhuma mudança visual ou de comportamento nos outros modos

### Arquivos alterados
- **`src/pages/Tasks.tsx`** — adicionar condição `viewMode !== "calendar"` no filtro de data

