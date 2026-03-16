

## Correção: Manter data ao concluir tarefa

### Problema

Na linha 121 de `src/pages/Tasks.tsx`, quando uma tarefa recorrente é concluída e a próxima recorrência é gerada, o código executa `setFilterDate(undefined)`, limpando o filtro de data. Isso faz a data "sumir".

### Solução

Remover o `setFilterDate(undefined)` do bloco de conclusão de tarefa recorrente. A data deve permanecer na data atual (ou na data selecionada pelo usuário). Se a intenção original era mostrar a nova recorrência gerada, basta manter a data atual — o `onRefresh` já recarrega as tarefas.

### Alteração

**`src/pages/Tasks.tsx`** — Remover `setFilterDate(undefined)` na linha 121, mantendo o toast e o restante do fluxo intacto.

