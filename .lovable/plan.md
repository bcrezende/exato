

## Auditoria de Segurança e Hardening

### 1. Estado Atual — RLS já implementado corretamente

Após auditoria completa, **todas as tabelas já possuem RLS ativado com políticas adequadas**:

| Tabela | RLS | Políticas hierárquicas |
|---|---|---|
| `tasks` | ✅ | Analista vê só suas, coordenador vê dos seus analistas, gerente vê do setor, admin vê tudo |
| `profiles` | ✅ | Usuários veem perfis da mesma empresa |
| `departments` | ✅ | Usuários veem departamentos da mesma empresa |
| `coordinator_analysts` | ✅ | Coordenador vê seus vínculos, admin/gerente veem todos da empresa |
| `user_roles` | ✅ | Usuários veem roles da mesma empresa |
| `notifications` | ✅ | Só próprias |
| `task_time_logs` | ✅ | Baseado na empresa da task |
| `task_delays` | ✅ | Baseado na empresa da task |
| `task_attachments` | ✅ | Hierárquico via task |
| `task_comments` | ✅ | Hierárquico via task |
| `invitations` | ✅ | Admin/gerente/coordenador da empresa |
| `companies` | ✅ | Só própria empresa |
| `company_holidays` | ✅ | Só própria empresa |
| `recurrence_definitions` | ✅ | Só própria empresa |
| `email_*` / `suppressed_emails` | ✅ | Só service_role |

### 2. Melhorias a implementar

As políticas RLS estão sólidas. O foco será no **frontend**:

#### A. Remover `console.error` que expõem detalhes internos (11 arquivos)

Substituir `console.error(err)` e `console.error("...", err)` por logging silencioso ou genérico em produção. Os erros de Supabase podem conter nomes de tabelas, colunas e detalhes de RLS que não devem aparecer no console do navegador.

**Abordagem**: Envolver todos os `console.error` em um helper `if (import.meta.env.DEV)` para só logar em desenvolvimento.

Arquivos afetados:
- `AuthContext.tsx` (2 ocorrências)
- `AdminDashboard.tsx`, `ManagerDashboard.tsx`, `CoordinatorDashboard.tsx`, `ManagerCoordinatorDashboard.tsx`
- `AnalystDetail.tsx`, `TeamMonitoring.tsx`, `Team.tsx`
- `AIAnalysisDialog.tsx`, `Analysis.tsx`
- `NotFound.tsx` (este pode manter, é só rota)

#### B. Criar helper centralizado de logging seguro

Criar `src/lib/logger.ts` com função que só loga em `DEV`:

```typescript
export function devError(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
}
```

#### C. Verificar loading states

Todos os dashboards e páginas já possuem loading states (skeletons/spinners) que previnem exposição de estrutura antes dos dados carregarem. Nenhuma mudança necessária.

### 3. Sobre a política de `profiles` e `departments`

As políticas atuais permitem que qualquer usuário da empresa veja **todos os perfis e departamentos da empresa**. Restringir isso por hierarquia **quebraria funcionalidades essenciais** como:
- Exibir nomes de criadores/responsáveis nas tarefas
- Dropdowns de atribuição de tarefas
- Visualização de membros da equipe

Isso é **intencional e correto** — o isolamento de dados sensíveis acontece nas tabelas de tarefas, não nos perfis.

### Resumo

- **RLS**: Já robusto e correto em todas as tabelas. Nenhuma mudança necessária.
- **Frontend**: Criar logger seguro e substituir ~15 `console.error` para não vazar detalhes em produção.
- **Loading states**: Já implementados em todas as páginas.

