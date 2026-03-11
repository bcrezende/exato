

## Plataforma de Monitoramento de Tarefas Corporativas

### 1. Autenticação e Onboarding
- Página de **Login** e **Registro** (apenas para Admin Global inicial)
- Sistema de **convites por email** — Admin convida Gerentes, Gerentes convidam Funcionários
- Página de **aceitar convite** com criação de senha
- Página de **esqueci a senha** e **redefinir senha**

### 2. Banco de Dados (Supabase)
- **companies** — id, name, created_at
- **departments** — id, company_id (FK), name, created_at
- **profiles** — id (FK auth.users), company_id, department_id, full_name, avatar_url, phone, position
- **user_roles** — id, user_id (FK auth.users), role (enum: admin, manager, employee)
- **tasks** — id, company_id, department_id, assigned_to (FK), created_by (FK), title, description, status (enum: pending, in_progress, completed, overdue), priority (enum: low, medium, high), due_date, recurrence_type (enum: daily, weekly, monthly, yearly), recurrence_parent_id, created_at
- **task_comments** — id, task_id, user_id, content, created_at
- **task_attachments** — id, task_id, user_id, file_url, file_name, created_at
- **invitations** — id, company_id, department_id, email, role, invited_by, token, accepted_at
- Storage bucket **task-attachments** para uploads
- RLS policies baseadas em `has_role()` security definer function

### 3. Hierarquia e Controle de Acesso (RBAC)
- **Admin**: vê tudo da empresa, gerencia setores, convida gerentes, relatórios globais
- **Manager (Gerente)**: vê/gerencia apenas seu setor, convida funcionários, cria tarefas
- **Employee (Funcionário)**: vê apenas suas tarefas, marca status, comenta, anexa arquivos
- Rotas protegidas com redirecionamento baseado no papel do usuário

### 4. Layout e Navegação
- **Sidebar** com navegação: Dashboard, Tarefas, Equipe/Setores (admin/manager), Configurações
- Header com avatar do usuário, nome e logout
- Design corporativo limpo, responsivo (mobile-friendly com sidebar colapsável)

### 5. Dashboard Principal
- **Visão Kanban** — colunas: Pendente, Em Andamento, Concluída, Atrasada (drag não necessário, clique para mover)
- **Visão Calendário** — visualização mensal com tarefas nos dias de prazo
- **Cards de resumo**: total de tarefas, concluídas hoje, atrasadas, em andamento
- **Filtros rápidos**: "Minhas Tarefas Hoje", "Tarefas da Semana", "Atrasadas"
- Admin vê métricas globais; Manager vê métricas do setor; Employee vê suas tarefas

### 6. CRUD de Tarefas
- **Modal de criação/edição** com campos: título, descrição, responsável (dropdown filtrado por setor), prazo (date/time picker), status, prioridade, recorrência
- Lista de tarefas com ordenação e filtros
- Detalhes da tarefa com seção de comentários e upload de anexos
- Sistema de recorrência: ao concluir tarefa recorrente, gera automaticamente a próxima ocorrência

### 7. Gestão de Equipe/Setores
- **Admin**: CRUD de setores, lista de gerentes e funcionários por setor, envio de convites
- **Manager**: lista de funcionários do seu setor, envio de convites para funcionários
- Tabela de membros com nome, cargo, email e papel

### 8. Notificações por Email
- Email de convite para novos usuários
- Notificação quando tarefa é atribuída
- Alerta de tarefa atrasada (via edge function + cron)

### 9. Configurações
- Editar perfil (nome, avatar, telefone, cargo)
- Admin: editar dados da empresa
- Gerenciamento de convites pendentes

