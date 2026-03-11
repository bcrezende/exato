

## Diagnóstico

### Problema 1: Email não chega
O sistema atual **não envia emails**. A função `sendInvite` apenas insere o convite no banco e gera um link para copiar manualmente. Não há integração de email configurada.

### Problema 2: Login inválido após aceitar convite
Mesmo problema do registro: `AcceptInvite` chama `signUp()` e depois tenta fazer `UPDATE profiles` e `INSERT user_roles` — mas como a confirmação de email é obrigatória, o usuário não tem sessão autenticada. As operações falham silenciosamente por RLS, e o login falha porque o email não foi confirmado.

## Solução

### 1. Migração SQL — função `handle_accept_invite`
Criar função SECURITY DEFINER que executa atomicamente:
- INSERT/UPDATE no `profiles` com `company_id`, `department_id` e `full_name`
- INSERT no `user_roles` com o papel do convite
- UPDATE na `invitations` marcando `accepted_at`

### 2. Ativar auto-confirm de email
Usar a ferramenta de configuração de auth para ativar auto-confirm. Como o acesso é controlado por convites, não há risco — apenas usuários convidados conseguem se cadastrar de forma útil.

### 3. Atualizar `AcceptInvite.tsx`
- Substituir as 3 chamadas separadas por `supabase.rpc('handle_accept_invite', ...)`
- Após signup + RPC, redirecionar direto ao `/dashboard` (auto-confirm ativo)

### 4. Email (escopo futuro)
O envio de email por convite requer configuração de domínio de email. Por enquanto o fluxo continua sendo copiar o link manualmente. Posso configurar isso como próximo passo se desejar.

