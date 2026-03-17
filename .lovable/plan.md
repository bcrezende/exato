

# Reestruturação de Hierarquia: Novo Modelo RBAC com Coordenador e Analista

## 1. Análise da Hierarquia Atual

| Cargo atual | Enum DB | Permissões |
|---|---|---|
| Admin | `admin` | Controle total: CRUD em tudo, gerencia empresa, setores, membros |
| Gerente | `manager` | CRUD tarefas do seu departamento, convida funcionários, vê análises |
| Funcionário | `employee` | Vê/cria/edita apenas tarefas atribuídas a si, sem acesso a Equipe/Análise |

O sistema usa um enum `app_role` com 3 valores, referenciado em: RLS policies (12+), `has_role()` function, e ~18 arquivos frontend.

---

## 2. Nova Hierarquia Proposta

```text
Admin
  └── Gerente (controle do departamento)
        └── Coordenador (supervisiona analistas específicos)
              └── Analista (executa tarefas)
```

| Cargo | Enum | Permissões |
|---|---|---|
| **Admin** | `admin` | Controle total. Gerencia empresa, setores, membros, análises. Vê tudo. |
| **Gerente** | `manager` | Gerencia o departamento. Cria tarefas, convida, vê análises do setor. Igual ao atual. |
| **Coordenador** | `coordinator` | Supervisiona analistas vinculados. Cria/delega tarefas para seus analistas. Vê tarefas dos seus analistas. Não gerencia o departamento inteiro. |
| **Analista** | `analyst` | Novo nome para "employee". Executa tarefas atribuídas. Cria tarefas próprias. |

### Relacionamento Coordenador → Analista

Nova tabela `coordinator_analysts` que mapeia quais analistas estão sob supervisão de cada coordenador. Um analista pode ter um coordenador. O gerente/admin define esses vínculos.

---

## 3. Plano de Implementação

### Fase 1 — Migração de Dados e Schema (Banco)

**Alterações SQL:**

1. Adicionar novos valores ao enum `app_role`:
   ```sql
   ALTER TYPE public.app_role ADD VALUE 'coordinator';
   ALTER TYPE public.app_role ADD VALUE 'analyst';
   ```

2. Criar tabela de vínculo coordenador-analista:
   ```sql
   CREATE TABLE public.coordinator_analysts (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     coordinator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     analyst_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     company_id uuid NOT NULL,
     created_at timestamptz DEFAULT now(),
     UNIQUE(coordinator_id, analyst_id)
   );
   ALTER TABLE coordinator_analysts ENABLE ROW LEVEL SECURITY;
   ```

3. Migrar dados: converter todos `employee` → `analyst`:
   ```sql
   UPDATE public.user_roles SET role = 'analyst' WHERE role = 'employee';
   ```

4. Criar função `get_coordinator_analyst_ids()` (SECURITY DEFINER) que retorna os IDs dos analistas vinculados a um coordenador.

5. Atualizar TODAS as RLS policies para incluir `coordinator` e `analyst`:
   - `coordinator` vê tarefas dos seus analistas (via `coordinator_analysts`)
   - `coordinator` cria tarefas para seus analistas
   - `analyst` mantém as mesmas permissões do antigo `employee`

6. Atualizar `has_role()` — não precisa de mudança na função, mas as policies que referenciam `'employee'` precisam ser alteradas para `'analyst'`.

**Tabelas e policies afetadas:**
- `tasks` (5 policies)
- `task_attachments` (3 policies)
- `task_comments` (3 policies)
- `task_time_logs` (2 policies)
- `user_roles` (4 policies)
- `invitations` (nova opção de role)
- Nova tabela `coordinator_analysts` (policies para admin/manager/coordinator)

### Fase 2 — Backend (Edge Functions)

- `generate-analysis`: incluir papel `coordinator` no acesso
- `generate-recurring-tasks`: sem mudança (opera via service role)
- `generate-insights`: sem mudança

### Fase 3 — Frontend (Arquivos afetados)

| Arquivo | Mudança |
|---|---|
| `src/contexts/AuthContext.tsx` | Tipo `AppRole` → adicionar `"coordinator" \| "analyst"` |
| `src/components/ProtectedRoute.tsx` | `allowedRoles` aceitar novos valores |
| `src/App.tsx` | Rotas: coordenador acessa `/team` (limitado), `/analysis`, `/tasks` |
| `src/components/AppSidebar.tsx` | Menu "Gestão" visível para coordinator (limitado). Labels atualizados. |
| `src/pages/Team.tsx` | Admin/Gerente podem vincular analistas a coordenadores. Nova aba ou seção "Vínculos". Coordenador vê apenas seus analistas. |
| `src/pages/Tasks.tsx` | `canManage` inclui coordinator. Coordinator filtra por seus analistas. |
| `src/components/tasks/TaskForm.tsx` | Coordinator vê apenas seus analistas no seletor. Sem seletor de departamento (herda do perfil). |
| `src/components/tasks/TaskDetailModal.tsx` | Coordinator pode editar/deletar tarefas dos seus analistas. |
| `src/pages/Dashboard.tsx` | Coordinator vê dashboard filtrado pelos seus analistas. |
| `src/pages/Analysis.tsx` | Coordinator acessa análises dos seus analistas. |
| `src/pages/Settings.tsx` | Sem mudança significativa. |
| `src/components/team/EditMemberDialog.tsx` | Novos roles no seletor. |
| `src/components/tasks/TaskImportDialog.tsx` | Coordinator importa tarefas para seus analistas. |
| Todos os `roleLabels` | `employee` → `Analista`, + `coordinator` → `Coordenador` |

### Fase 4 — Testes Críticos

| Cenário | Validação |
|---|---|
| Coordenador cria tarefa | Só aparece analistas vinculados no seletor |
| Coordenador vê tarefas | Só vê tarefas dos seus analistas |
| Analista vê tarefas | Igual ao employee atual — só as suas |
| Gerente vê equipe | Vê coordenadores e analistas do setor |
| Admin vincula analista | Vínculo persiste, RLS funciona |
| Migração employee→analyst | Dados existentes continuam funcionando |
| Coordenador sem analistas | Interface vazia, sem erros |

### Fase 5 — Segurança

- RLS da `coordinator_analysts`: admin/manager inserem/deletam; coordinator lê os seus
- Coordinator NÃO pode escalar permissões (não edita roles, não cria setores)
- Analyst não vê tarefas de outros analistas mesmo do mesmo coordenador
- Todas as policies revisadas para não ter brechas com os 2 novos roles

### Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Enum migration irreversível (`ADD VALUE`) | Testar em staging. Não é possível remover valores de enum. |
| RLS com 4 roles fica complexa | Funções helper (`is_coordinator_of`, `get_coordinator_analyst_ids`) para simplificar |
| Employee existente quebra | Migração atômica: renomeia no mesmo deploy |
| Frontend referência "employee" hardcoded | Busca global + replace em todos os arquivos |

### Cronograma Estimado

| Fase | Duração estimada |
|---|---|
| 1. Schema + Migração SQL | 1 mensagem |
| 2. RLS policies (todas) | 1 mensagem |
| 3. Frontend — Auth, Sidebar, Routes | 1 mensagem |
| 4. Frontend — Tasks, Team, Dashboard | 1-2 mensagens |
| 5. Frontend — Analysis, Import, Edge Functions | 1 mensagem |
| 6. Testes e ajustes | 1 mensagem |

**Total estimado: 5-7 iterações de implementação.**

