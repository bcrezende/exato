

## Plano de Exportação do Banco de Dados

### Resumo do Banco

| Tabela | Registros |
|---|---|
| companies | 4 |
| departments | 7 |
| profiles | 21 |
| user_roles | 21 |
| coordinator_analysts | 3 |
| recurrence_definitions | 27 |
| tasks | 264 |
| task_delays | 160 |
| task_time_logs | 321 |
| notifications | 591 |
| invitations | 21 |
| analysis_history | 3 |
| email_send_log | 45 |
| email_send_state | 1 |
| company_holidays | 0 |
| task_attachments | 0 |
| task_comments | 0 |
| suppressed_emails | 0 |
| email_unsubscribe_tokens | 0 |

### O que será exportado

**1. Arquivo SQL de esquema** (`schema.sql`)
- Enums: `app_role`, `delay_log_type`, `interval_unit`, `task_priority`, `task_status`
- Todas as 19 tabelas com colunas, defaults, constraints
- Todas as funções (14 funções)
- Todos os triggers
- Todas as RLS policies
- Índices e unique constraints

**2. Arquivos CSV de dados** (um por tabela com registros)
- 13 tabelas com dados (exclui tabelas vazias)
- Exportados com headers para fácil importação

### Execução

Vou gerar tudo via scripts que:
1. Extraem o DDL completo (CREATE TYPE, CREATE TABLE, CREATE FUNCTION, CREATE POLICY)
2. Exportam cada tabela com dados como CSV via `psql COPY`
3. Geram um script `import.sql` com comandos `COPY FROM` na ordem correta (respeitando foreign keys)

### Entregáveis

Todos os arquivos em `/mnt/documents/`:
- `schema.sql` - esquema completo pronto para executar
- `import_data.sql` - script de importação dos CSVs
- `data/` - pasta com CSVs de cada tabela
- `README.md` - instruções de como importar no novo projeto

### Limitação importante

Os dados da tabela `profiles` referenciam `auth.users` (que é gerenciada pelo sistema de autenticação). Os usuários precisarão se registrar novamente no novo projeto, e os IDs serão diferentes. Fornecerei instruções sobre como lidar com isso.

