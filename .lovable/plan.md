

## Bug: Tarefa recorrente não gerada ao admin concluir tarefa

### Evidências

1. **Network request falhou**: A chamada à Edge Function retornou "Failed to fetch" (erro de rede) — a função nunca foi alcançada.
2. **Bug no código**: Em `task-utils.ts`, o `Promise.all(secondaryOps)` NÃO é awaited (linha 67). Isso significa que:
   - `generatedRecurring` é SEMPRE `false` no return (o `.then()` ainda não executou)
   - Erros são engolidos silenciosamente
   - O `fetchTasks()` no chamador nunca é acionado para mostrar a nova tarefa

### Causa raiz

O padrão fire-and-forget impede que:
- Erros na Edge Function sejam detectados e reportados ao usuário
- O flag `generatedRecurring` reflita o resultado real
- A lista de tarefas seja recarregada após a geração

### Correção

**`src/lib/task-utils.ts`** — Awaitar as operações secundárias para garantir que a Edge Function complete antes de retornar:

```typescript
// Antes (fire-and-forget - QUEBRADO):
if (secondaryOps.length > 0) {
  Promise.all(secondaryOps).catch(console.error);
}
return { error: null, generatedRecurring };

// Depois (awaited):
if (secondaryOps.length > 0) {
  await Promise.all(secondaryOps);
}
return { error: null, generatedRecurring };
```

Isso garante que:
- A Edge Function é chamada e o resultado é capturado
- `generatedRecurring` reflete o resultado correto
- Erros de rede são propagados ao chamador (toast de erro ao usuário)
- O `onRefresh()` / `fetchTasks()` recarrega a lista com a nova tarefa gerada

### Arquivo alterado
- `src/lib/task-utils.ts` — trocar fire-and-forget por await

