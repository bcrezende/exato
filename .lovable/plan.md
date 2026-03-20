

## Correção: Edge Function Não Inicia (Boot Error)

### Problema

Os logs da Edge Function mostram:

```
worker boot error: Uncaught SyntaxError: Identifier 'durationMs' has already been declared at line 266
```

A função não consegue iniciar, retorna erro no preflight OPTIONS, e o browser mostra erro de CORS.

### Causa Raiz

O bloco `if (weekdays)` (linha 228) nunca é fechado com `}` antes do código de intervalo padrão (linha 317+). A estrutura atual:

```text
for (parent of parentTasks) {
  if (def && def.weekdays) {        // linha 228
    const durationMs = ...          // linha 232 ← primeira declaração
    ...weekday loops...
    continue;                       // linha 315
    // código morto mas MESMO escopo:
    const durationMs = ...          // linha 334 ← DUPLICATA → CRASH
  }                                 // linha 425
}                                   // linha 426
```

Ambas as declarações `const durationMs` estão no mesmo bloco, causando o SyntaxError.

### Correção

Fechar o `if` logo após o `continue` (linha 315), para que o código de intervalo fique em escopo separado:

```text
for (parent of parentTasks) {
  if (def && def.weekdays) {        // linha 228
    const durationMs = ...          // OK
    ...weekday loops...
    continue;                       // pula para próximo parent
  }                                 // ← ADICIONAR } AQUI

  // Fluxo de intervalo (escopo separado)
  const durationMs = ...            // OK, escopo diferente
  ...
}
```

### Arquivo

| Arquivo | Mudança |
|---|---|
| `supabase/functions/generate-recurring-tasks/index.ts` | Adicionar `}` após `continue;` (linha 315) e remover o `}` extra na linha 425 |

