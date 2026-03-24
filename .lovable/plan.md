

## Gerar CSV de usuários com UUIDs originais

### Problema

O CSV gerado anteriormente não incluiu o `id` (UUID) dos usuários. Sem ele, ao importar no novo banco, as foreign keys em `tasks`, `profiles`, `user_roles`, `coordinator_analysts`, `notifications`, etc. quebrariam.

### Solução

Gerar um novo CSV incluindo o UUID original como primeira coluna:

```sql
SELECT 
  u.id,
  u.email,
  p.full_name as nome,
  ur.role,
  d.name as departamento,
  p.department_id,
  p.company_id,
  u.encrypted_password
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.departments d ON d.id = p.department_id
ORDER BY p.full_name;
```

Campos exportados: `id`, `email`, `nome`, `role`, `departamento`, `department_id`, `company_id`, `encrypted_password`

Incluir também `department_id` e `company_id` como UUIDs para facilitar a recriação dos vínculos no destino.

Arquivo: `/mnt/documents/usuarios_migracao_v2.csv`

