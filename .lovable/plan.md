

## Gerar arquivo users.csv com dados de todos os usuários

### O que será feito

Executar uma query SQL via `psql` que junta `auth.users`, `profiles`, `user_roles` e `departments` para exportar um CSV completo para `/mnt/documents/users.csv`.

### Query

```sql
SELECT
  u.id AS uuid,
  u.email,
  p.full_name AS nome,
  ur.role,
  d.name AS departamento
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN departments d ON d.id = p.department_id
ORDER BY ur.role, p.full_name;
```

### Saída

Arquivo CSV em `/mnt/documents/users.csv` com colunas: `uuid, email, nome, role, departamento`.

