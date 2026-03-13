

## Limpar todos os dados do banco para produção

O plano é remover todos os dados existentes das tabelas, mantendo a estrutura intacta, na ordem correta para respeitar as dependências entre tabelas.

### Ordem de exclusão (respeitando foreign keys)

1. `task_time_logs` — depende de tasks
2. `task_comments` — depende de tasks
3. `task_attachments` — depende de tasks
4. `tasks` — depende de profiles, departments, companies
5. `invitations` — depende de departments, companies, profiles
6. `user_roles` — depende de auth.users
7. `profiles` — depende de companies, departments
8. `departments` — depende de companies
9. `companies` — tabela raiz

### Importante

- Isso vai **apagar todos os usuários, empresas, tarefas e convites** do ambiente atual
- Após limpar, será necessário criar um novo registro (empresa + admin) pela tela de cadastro
- Os arquivos no storage (bucket `task-attachments`) também devem ser limpos separadamente se houver arquivos

### Execução

Será feito via ferramenta de inserção/deleção de dados (não migração, pois não altera estrutura).

