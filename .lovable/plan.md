

## Fix: Campo "Recorrência" duplicado no TaskForm

### Problema

O formulário tem **dois blocos** que renderizam o seletor de Recorrência:

1. **Linha 328-348** — dentro do bloco `!isAnalyst` → `else` de `isAdmin` (ou seja, exibido para **manager** e **coordinator**)
2. **Linha 367-387** — exibido para `isAdmin || isCoordinator || isAnalyst`

Para o **coordinator**, ambas as condições são verdadeiras, então o campo aparece duas vezes. O mesmo aconteceria se um manager fosse adicionado à segunda condição no futuro.

### Correção

**Arquivo:** `src/components/tasks/TaskForm.tsx`

- **Linha 328**: Alterar a condição do `else` para mostrar Recorrência apenas para **manager** (que não aparece no segundo bloco):
  - Trocar de `) : (` para `) : isManager ? (` e fechar com `) : null}`
  - Isso garante que o primeiro bloco de Recorrência só apareça para managers
  - O segundo bloco (linha 367) já cobre admin, coordinator e analyst corretamente

### Resultado

Cada role verá o campo Recorrência exatamente **uma vez**:
- **Admin**: bloco 2 (linhas 367-387)
- **Manager**: bloco 1 (linhas 328-348), ao lado do Responsável
- **Coordinator**: bloco 2 (linhas 367-387)
- **Analyst**: bloco 2 (linhas 367-387)

