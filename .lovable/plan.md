

## Gerar documento de políticas RLS e hierarquia de usuários

### O que será feito

Gerar um arquivo Markdown em `/mnt/documents/` com:

1. **Hierarquia de Usuários** — diagrama e descrição dos 4 níveis (Admin → Manager → Coordinator → Analyst)
2. **Tabela resumo de permissões** — matriz CRUD por role por tabela
3. **Políticas RLS detalhadas** — todas as policies de cada tabela, agrupadas por tabela, com explicação em português

### Conteúdo principal

**Hierarquia:**
- **Admin**: Controle total da empresa. Pode criar/editar/deletar tudo no escopo da empresa. Não pode alterar `is_master`.
- **Manager (Gerente)**: Gestão do seu departamento. Vê e gerencia tarefas do seu setor.
- **Coordinator (Coordenador)**: Supervisiona analistas vinculados via `coordinator_analysts`. Vê suas próprias tarefas + dos analistas.
- **Analyst (Analista)**: Executa tarefas. Só vê/edita suas próprias tarefas.
- **Master**: Flag especial em `profiles.is_master` — acesso a configurações globais (changelog, templates de email).

**Tabelas cobertas** (17 tabelas com RLS):
`tasks`, `profiles`, `user_roles`, `invitations`, `departments`, `companies`, `task_attachments`, `task_comments`, `task_time_logs`, `task_delays`, `task_not_done_logs`, `notifications`, `analysis_history`, `audit_logs`, `changelog_entries`, `email_*`, `recurrence_definitions`, etc.

### Formato

Arquivo Markdown detalhado + diagrama Mermaid da hierarquia.

### Arquivo gerado

| Arquivo | Descrição |
|---|---|
| `/mnt/documents/rls-policies-hierarchy.md` | Documento completo com hierarquia e todas as políticas RLS |
| `/mnt/documents/hierarchy-diagram.mmd` | Diagrama Mermaid da hierarquia |

