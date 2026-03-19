

## Diagnóstico: Lentidão no Carregamento das Páginas

### Causa raiz identificada

O problema principal está no **AuthContext** — ele marca `loading = false` **antes** de buscar o perfil e o role do usuário. Isso causa uma cascata de problemas:

1. `loading` fica `false` → componentes renderizam com `role = null` e `profile = null`
2. Os `useEffect` das páginas (Dashboard, Tasks, etc.) dependem de `role` e `profile`
3. Quando `role` e `profile` chegam (atrasados), os `useEffect` disparam **de novo**, causando re-fetch completo
4. Resultado: cada página faz **2x as requisições** ao banco (visível nos logs de rede — departments, profiles e tasks aparecem duplicados)

Além disso, o `fetchUserData` usa `setTimeout(() => ..., 0)` no `onAuthStateChange`, o que atrasa ainda mais a obtenção do role.

### Plano de correção

#### 1. Corrigir `src/contexts/AuthContext.tsx` — aguardar dados antes de liberar loading

- No `getSession()`: só chamar `setLoading(false)` **após** `fetchUserData` completar (usar `await`)
- No `onAuthStateChange`: remover o `setTimeout` e usar `await fetchUserData()` diretamente, chamando `setLoading(false)` somente depois
- Isso garante que quando `loading = false`, `profile` e `role` já estão disponíveis

```text
Antes:
  onAuthStateChange → setLoading(false) → setTimeout(fetchUserData)
  getSession → setLoading(false) → fetchUserData (sem await)

Depois:
  onAuthStateChange → await fetchUserData → setLoading(false)
  getSession → await fetchUserData → setLoading(false)
```

#### 2. Corrigir `src/pages/Dashboard.tsx` — remover re-fetch desnecessário

- O `useEffect` depende de `[user, role, profile]` — quando role/profile mudam, refaz tudo
- Mudar a dependência para apenas `[user]` (já que user não muda após login) e adicionar early return se `!role` (para aguardar o AuthContext estar pronto)

#### 3. Corrigir `src/pages/Tasks.tsx` — mesmo padrão

- Garantir que o fetch de dados só dispara uma vez, aguardando role estar disponível

#### 4. Corrigir warning de ref no console

- O `PendingTasksAlert` está recebendo ref como function component — precisa ser exportado corretamente (não precisa de forwardRef neste caso, mas o componente pode estar sendo passado de forma incorreta)

### Arquivos afetados

1. `src/contexts/AuthContext.tsx` — fix loading flow
2. `src/pages/Dashboard.tsx` — fix useEffect dependencies
3. `src/pages/Tasks.tsx` — fix useEffect dependencies
4. `src/components/tasks/PendingTasksAlert.tsx` — fix ref warning

### Impacto esperado

- Redução de ~50% nas requisições ao banco (elimina duplicatas)
- Carregamento percebido mais rápido (sem re-render intermediário com dados vazios)
- Eliminação dos warnings no console

