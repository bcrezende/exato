

## Corrigir policies de UPDATE e DELETE em user_roles — escopo por empresa

### Problema
As policies "Admins can update roles" e "Admins can delete roles" só verificam `has_role(auth.uid(), 'admin')`, sem validar empresa. Um admin pode alterar/deletar roles de usuários de outras empresas.

### Solução
Recriar ambas as policies adicionando verificação de que o `user_id` alvo pertence à mesma empresa.

### Migração SQL

```sql
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
      AND p.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
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
| Migração SQL | Recriar policies de UPDATE e DELETE com verificação de empresa |

