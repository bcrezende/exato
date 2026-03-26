

## Corrigir escopo de empresa na policy de managers em user_roles

### Problema

A policy "Managers can insert limited roles" permite que um gerente atribua roles a usuários de **qualquer empresa**, pois não valida se o `user_id` alvo pertence à mesma empresa do gerente.

### Solução

Adicionar verificação de `company_id` na policy, garantindo que o usuário alvo pertença à mesma empresa do gerente.

### Migração SQL

```sql
DROP POLICY IF EXISTS "Managers can insert limited roles" ON user_roles;

CREATE POLICY "Managers can insert limited roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  AND role = ANY (ARRAY['analyst'::app_role, 'coordinator'::app_role, 'employee'::app_role])
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
      AND p.company_id = get_user_company_id(auth.uid())
  )
);
```

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| Migração SQL | Recriar policy com verificação de empresa |

