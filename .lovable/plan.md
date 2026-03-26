

## Corrigir escopo de empresa na policy de admins em user_roles

### Problema

A policy "Admins can insert any role" verifica apenas que o ator é admin, mas não valida se o `user_id` alvo pertence à mesma empresa. Um admin poderia atribuir roles a usuários de outras empresas.

### Solução

Recriar a policy adicionando verificação de `company_id` no `user_id` alvo.

### Migração SQL

```sql
DROP POLICY IF EXISTS "Admins can insert any role" ON public.user_roles;

CREATE POLICY "Admins can insert any role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
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

