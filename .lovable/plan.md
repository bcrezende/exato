

## Redirecionar para login após aceitar convite

Atualmente em `AcceptInvite.tsx` (linha 68), após criar a conta o usuário é redirecionado para `/dashboard` já logado. A correção é simples:

### Alteração em `src/pages/AcceptInvite.tsx`

Após o `signUp` e `handle_accept_invite` com sucesso:
1. Chamar `supabase.auth.signOut()` para encerrar a sessão criada automaticamente pelo signup
2. Redirecionar para `/login` em vez de `/dashboard`
3. Ajustar a mensagem do toast para informar que o usuário deve fazer login

### Arquivo afetado
- `src/pages/AcceptInvite.tsx`

