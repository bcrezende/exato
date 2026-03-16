

## Problemas identificados no Drag and Drop

### 1. Demora na atualização visual

**Causa**: `handleStatusChange` aguarda sequencialmente: atualização no DB -> getSession -> time log -> Edge Function -> fetchTasks(). Nenhuma atualização otimista é feita. O card só muda de coluna após 4-5 chamadas de rede completarem.

**Correção**: Adicionar atualização otimista do estado `tasks` ANTES de chamar `updateTaskStatus`. O card muda de coluna instantaneamente e a persistência acontece em background.

### 2. Geração automática não funcionou

**Causa**: Nos logs da Edge Function, não há registro de invocação para a tarefa de teste. O `.catch()` em `task-utils.ts` engole silenciosamente erros de rede (como "Failed to fetch"), impedindo que o usuário veja qualquer feedback. A função nunca foi chamada ou falhou silenciosamente.

**Correção**: Remover o `.catch()` que engole erros e deixar o erro propagar para o `handleStatusChange`, que já tem try/catch com toast de erro.

### Alterações

**`src/pages/Tasks.tsx`** — `handleStatusChange`:
- Antes de chamar `updateTaskStatus`, atualizar `setTasks` otimisticamente mudando o status do card
- Em caso de erro, reverter o estado ao anterior

```typescript
const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  
  // Otimista: atualizar UI imediatamente
  const previousTasks = tasks;
  setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  
  try {
    await updateTaskStatus(taskId, newStatus as any, task);
    toast({ title: "Status atualizado!" });
    await fetchTasks(); // sincronizar com servidor
  } catch {
    setTasks(previousTasks); // reverter
    toast({ variant: "destructive", title: "Erro ao atualizar status" });
  }
}, [tasks, toast]);
```

**`src/lib/task-utils.ts`** — Remover `.catch()` da invocação da Edge Function:
- Trocar `.catch(err => console.error(...))` por deixar o erro propagar naturalmente via `Promise.all`
- Isso permite que o toast de erro apareça quando a Edge Function falha

### Arquivos alterados
- `src/pages/Tasks.tsx` — atualização otimista no handleStatusChange
- `src/lib/task-utils.ts` — remover catch silencioso na Edge Function

