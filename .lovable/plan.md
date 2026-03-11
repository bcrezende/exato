

## Plano: Filtrar tarefas do funcionário apenas para as atribuídas a ele

O RLS no banco já filtra corretamente (funcionários só veem tarefas onde `assigned_to = auth.uid()`), então os dados retornados já estão corretos. No entanto, para garantir clareza e consistência, adicionaremos filtros explícitos no frontend.

### Alterações

**1. `src/pages/Tasks.tsx`** (linha ~43)
- Quando `role === "employee"`, adicionar `.eq("assigned_to", user.id)` na query de tasks.

**2. `src/pages/Dashboard.tsx`** (linha ~42-46)
- Quando `role === "employee"`, adicionar `.eq("assigned_to", user.id)` na query de tasks.
- Atualizar o subtítulo do dashboard para mostrar "suas tarefas" para funcionários.

Essas alterações são redundantes com o RLS (que já filtra), mas tornam a intenção explícita no código e evitam qualquer confusão futura.

