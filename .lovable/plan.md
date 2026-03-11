

## Plano: Restringir Ações de Status do Funcionário

### Problema
1. No modal de detalhes (`TaskDetailModal`), o funcionário tem um `Select` que permite mudar para **qualquer** status (pending, in_progress, completed, overdue).
2. Na lista de tarefas (`Tasks.tsx`), o mesmo `Select` livre aparece.
3. Na tela "Meu Dia", o fluxo já está correto (Iniciar → Concluir), mas falta impedir reversão após concluir.
4. Requisito: uma vez concluída, o funcionário **não pode** reverter — precisa pedir ao gerente.

### Alterações

**1. `src/components/tasks/TaskDetailModal.tsx`**
- Substituir o `Select` livre do funcionário por botões de ação rápida idênticos ao "Meu Dia":
  - `pending` → botão "Iniciar" (muda para `in_progress`)
  - `in_progress` → botão "Concluir" (muda para `completed`)
  - `completed` → badge "Concluída" + mensagem "Para alterar, solicite ao gerente"
- Remover o componente `Select` para funcionários

**2. `src/pages/Tasks.tsx` (lista)**
- Substituir o `Select` livre do funcionário na lista por mesmos botões de ação rápida:
  - `pending` → botão "Iniciar"
  - `in_progress` → botão "Concluir"
  - `completed` → badge "Concluída" (sem ação)
- Remover o `Select` de status para role `employee`

**3. `src/components/dashboard/MyDayView.tsx`**
- Após concluir, exibir badge "Concluída" (já faz isso) — sem alteração necessária, fluxo já correto

### Arquivos
- `src/components/tasks/TaskDetailModal.tsx` — substituir Select por botões limitados
- `src/pages/Tasks.tsx` — substituir Select por botões limitados

