

## Criar índices de performance para RLS

### Objetivo
Adicionar índices nas colunas mais usadas pelas políticas de RLS para eliminar sequential scans e prevenir futuros problemas de performance.

### Migração SQL

Uma única migração com os seguintes índices:

1. **`idx_profiles_company_id`** em `profiles(company_id)` — usado por `get_user_company_id()` que é chamado em praticamente toda policy de RLS
2. **`idx_user_roles_user_id`** em `user_roles(user_id)` — usado por `has_role()` que é chamado em toda verificação de permissão
3. **`idx_tasks_company_id`** em `tasks(company_id)` — filtro principal em todas as policies da tabela tasks
4. **`idx_tasks_assigned_to`** em `tasks(assigned_to)` — usado em policies de SELECT/UPDATE/DELETE de tasks
5. **`idx_notifications_user_id`** em `notifications(user_id)` — filtro principal nas policies de notifications

### Arquivos impactados
- Apenas migração SQL (nenhuma alteração de código)

