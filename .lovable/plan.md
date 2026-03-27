

## Corrigir escalação de privilégios em user_roles

### Análise

As policies atuais de INSERT em `user_roles` são ambas **permissivas** — um usuário só precisa satisfazer UMA delas. Embora ambas exijam `has_role('admin')` ou `has_role('manager')`, a abordagem mais segura é adicionar uma policy **restritiva** que garanta explicitamente que apenas admins e managers possam inserir roles.

### Solução

Adicionar uma policy **RESTRICTIVE** que bloqueia INSERT para qualquer usuário que não seja admin ou manager. Policies restritivas são avaliadas com AND (todas devem passar), servindo como barreira adicional.

### Migração SQL

```sql
CREATE POLICY "Only admins and managers can insert roles"
ON public.user_roles FOR INSERT TO authenticated
AS RESTRICTIVE
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);
```

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| Migração SQL | Adicionar policy RESTRICTIVE de INSERT em user_roles |

