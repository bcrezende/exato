

## Plano: Filtro de data padrão = dia atual

### Alteração

**`src/pages/Tasks.tsx`** — 3 mudanças simples:

1. **Inicializar `filterDate` com `new Date()`** em vez de `undefined` (linha 53)
2. **Ajustar `hasActiveFilters`** — considerar filtro de data ativo apenas quando diferente de hoje (comparar com `startOfDay(new Date())`) (linha 105)
3. **Ajustar `clearFilters`** — resetar `filterDate` para `new Date()` em vez de `undefined` (linha 113)

Isso faz com que ao abrir `/tasks`, o usuário já veja apenas as tarefas do dia atual, podendo mudar a data ou limpar os filtros.

