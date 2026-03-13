

## Corrigir atualização visual do modal ao mudar status

### Problema
Quando o usuário clica "Iniciar", o `handleStatusChange` atualiza o banco e chama `onRefresh()` (que busca tarefas novas), mas o `detailTask` no estado do pai é um snapshot antigo que nunca é atualizado — o modal continua mostrando o status anterior.

### Solução

**`src/components/tasks/TaskDetailModal.tsx`**:
- Adicionar estado local `localTask` inicializado a partir da prop `task`
- Sincronizar com `useEffect` quando `task` mudar (prop atualizada pelo pai)
- No `handleStatusChange`, após sucesso, atualizar `localTask` otimisticamente com o novo status antes mesmo do `onRefresh` retornar
- Usar `localTask` em vez de `task` em todo o render do modal

Isso garante feedback visual imediato ao clicar "Iniciar" ou "Concluir", sem precisar fechar e reabrir.

### Arquivo alterado
- `src/components/tasks/TaskDetailModal.tsx`

