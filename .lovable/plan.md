

## Correção: Flash da tela "Tentar novamente" ao voltar ao site

### Causa raiz

Quando o usuario volta ao site, dois fluxos concorrentes disparam no `AuthContext`:

1. `onAuthStateChange` detecta a sessao existente → seta `user` → chama `fetchUserData`
2. `getSession` tambem resolve → seta `user` → chama `fetchUserData` novamente

O problema: `fetchUserData` reseta `identityReady = false` na linha 59 a cada chamada. Isso cria uma janela onde `user` existe, `loading` e `false`, mas `identityReady` e `false` — e o `ProtectedRoute` interpreta isso como erro, mostrando a tela de "Tentar novamente / Sair".

### Solucao

Duas correcoes complementares:

**1. `ProtectedRoute.tsx`** — Tratar `!identityReady && !profileError` como estado de carregamento (spinner), nao como erro. A tela de retry so deve aparecer quando `profileError === true`.

```
// Antes (mostra botoes de retry quando identityReady=false)
if (profileError || !identityReady) { ... retry screen }

// Depois (separa os dois casos)
if (!identityReady && !profileError) { ... spinner }
if (profileError) { ... retry screen }
```

**2. `AuthContext.tsx`** — Evitar dupla chamada de `fetchUserData`. Deduplicar usando uma flag `fetchingRef` para ignorar chamadas concorrentes, e nao resetar `identityReady` se ja estiver `true` (recarregamento silencioso).

### Arquivos impactados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/ProtectedRoute.tsx` | Separar loading de erro |
| `src/contexts/AuthContext.tsx` | Deduplicar fetchUserData, nao resetar identityReady desnecessariamente |

