

## Plano: Corrigir contagem de tarefas no "Meu Dia"

### Problema
A query do `MyDayView` filtra apenas tarefas com `start_date` ou `due_date` dentro do dia atual. Tarefas atrasadas (com `due_date` anterior a hoje) não são retornadas, então aparecem como 0 pendentes.

### Solução — `src/components/dashboard/MyDayView.tsx`

Alterar a query (linha 32-37) para também buscar tarefas com status `overdue` ou `pending` cuja `due_date` já passou:

```
.or(`status.eq.overdue,and(start_date.gte.${todayStart},start_date.lte.${todayEnd}),and(due_date.gte.${todayStart},due_date.lte.${todayEnd})`)
```

Isso garante que:
- Tarefas do dia continuam aparecendo normalmente
- Tarefas atrasadas (status `overdue`) sempre aparecem no "Meu Dia"

Também atualizar os `stats` para incluir um card de "Atrasadas" separado de "Pendentes", para dar visibilidade ao funcionário.

### Alterações
- **`src/components/dashboard/MyDayView.tsx`**:
  - Ajustar a query para incluir tarefas com `status.eq.overdue`
  - Adicionar card de "Atrasadas" nos stats (grid de 3 → 4 colunas)
  - Ordenar tarefas atrasadas primeiro na lista

