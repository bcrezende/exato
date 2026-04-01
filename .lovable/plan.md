

## Regenerar usuarios_migracao_v2.csv sem a coluna encrypted_password

### O que será feito

Executar a function `export_users_csv()` novamente via `psql`, mas excluindo a coluna `encrypted_password` do SELECT, e salvar como novo arquivo em `/mnt/documents/usuarios_migracao_v2.csv`.

### Query

```sql
COPY (SELECT id, email, nome, role, departamento, department_id, company_id FROM export_users_csv()) TO STDOUT WITH CSV HEADER
```

### Arquivo gerado

| Arquivo | Descrição |
|---|---|
| `/mnt/documents/usuarios_migracao_v2.csv` | CSV com id, email, nome, role, departamento, department_id, company_id (sem encrypted_password) |

