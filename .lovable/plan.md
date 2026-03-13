

## Melhorar tempo de resposta dos botões Iniciar/Concluir

### Problema
Ao clicar em "Iniciar" ou "Concluir", o usuário espera toda a cadeia sequencial: update no banco → getUser → insert time_log → (se recorrente) invoke edge function — só depois a UI atualiza. São 3-4 requests em série antes do feedback visual.

### Solução

**`src/lib/task-utils.ts`**:
- Paralelizar as operações secundárias: após o `update` do status (essencial), disparar o `insert` do time_log e o `invoke` da edge function em paralelo com `Promise.all`, sem `await` sequencial
- Cachear o `user` — usar `supabase.auth.getSession()` (síncrono do cache local) em vez de `supabase.auth.getUser()` (faz request ao servidor)

**`src/components/tasks/TaskDetailModal.tsx`**:
- Mover o `setLocalTask` (atualização otimista) para **antes** do `await updateTaskStatus`, revertendo em caso de erro
- Adicionar estado `loading` para desabilitar botões durante a operação

**`src/components/dashboard/MyDayView.tsx`**:
- Mesma lógica: atualizar `setTasks` otimisticamente **antes** do `await`, revertendo em caso de erro

### Resultado
- Feedback visual instantâneo (otimista)
- Redução de ~300-500ms por eliminar `getUser` network call
- Operações secundárias não bloqueiam a UI

