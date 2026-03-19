

## Diagnóstico: Login Lento Após Fix

### Causa raiz

O problema está no `onAuthStateChange` com `await fetchUserData()`. O Supabase recomenda **não fazer trabalho assíncrono pesado** dentro desse callback, pois ele bloqueia o processamento interno do auth. O fluxo atual após login:

1. `signInWithPassword` retorna → Login chama `navigate("/dashboard")`
2. `onAuthStateChange` dispara com `SIGNED_IN` → **bloqueia** esperando 2 queries (profiles + user_roles)
3. Só depois `loading = false` → ProtectedRoute libera → Dashboard renderiza
4. Dashboard faz mais 4 queries

Resultado: o usuário fica preso no spinner por ~3-5 segundos (2 queries do auth + 4 queries do dashboard em série).

Além disso, há uma race condition: `navigate("/dashboard")` é chamado no Login **antes** do AuthContext ter profile/role, então o ProtectedRoute mostra spinner até o `onAuthStateChange` terminar.

### Plano de correção

#### 1. `src/contexts/AuthContext.tsx` — Não bloquear o callback do auth

- No `onAuthStateChange`: setar `user` e `session` sincronamente, depois chamar `fetchUserData` **sem await** mas usando `.then(() => setLoading(false))`
- Isso desbloqueia o processamento interno do Supabase auth
- O `loading` ainda só fica `false` após os dados carregarem
- No `getSession`: manter o `await` (é o caminho de inicialização, não bloqueia nada)

```text
Antes (bloqueia auth):
  onAuthStateChange → await fetchUserData → setLoading(false)

Depois (não bloqueia auth):
  onAuthStateChange → setUser/setSession → fetchUserData().then(setLoading(false))
```

#### 2. `src/pages/Login.tsx` — Aguardar auth estar pronto antes de navegar

- Em vez de navegar imediatamente após `signInWithPassword`, aguardar que o AuthContext tenha `role` disponível
- Isso evita que o ProtectedRoute mostre spinner desnecessariamente
- Abordagem: usar o navigate apenas, mas não chamar `setLoading(false)` no Login antes da navegação (o botão fica em "Entrando..." até o redirect acontecer naturalmente)

#### 3. `src/pages/Dashboard.tsx` — Prefetch durante auth

- Nenhuma mudança necessária (já tem guard `if (!user || !role || !profile) return`)

### Arquivos afetados

1. `src/contexts/AuthContext.tsx` — não bloquear onAuthStateChange com await
2. `src/pages/Login.tsx` — manter loading visual até navegação completar

