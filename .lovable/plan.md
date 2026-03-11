

## Diagnóstico

O erro ocorre porque o fluxo de registro tenta criar a empresa **após o signup**, mas como a confirmação de email é obrigatória, o usuário não tem uma sessão autenticada nesse momento. As chamadas subsequentes (criar empresa, atualizar perfil, atribuir role) são feitas com o token anônimo, que é bloqueado pelas políticas RLS.

## Solução

Criar uma **função server-side** (security definer) que executa todo o onboarding (criar empresa, atualizar perfil, atribuir role admin) em uma única chamada, usando o service role para contornar o RLS de forma segura.

### 1. Migração SQL
- Criar função `handle_registration(_user_id uuid, _company_name text, _full_name text)` com `SECURITY DEFINER`
- A função: insere na `companies`, atualiza `profiles.company_id` e `profiles.full_name`, insere `user_roles` com role `admin`
- Remover a política RLS restritiva de INSERT na `companies` (a criação de empresa só ocorre via função server-side)

### 2. Atualizar `Register.tsx`
- Após o `signUp`, chamar `supabase.rpc('handle_registration', { ... })` ao invés de fazer 3 chamadas separadas
- Tratar o caso de email não confirmado: mostrar mensagem pedindo para verificar o email antes de redirecionar ao dashboard

### 3. Fluxo corrigido
1. Usuário preenche formulário → `signUp()` cria conta
2. `handle_registration()` (security definer) cria empresa + vincula perfil + atribui role admin
3. Mostrar mensagem: "Verifique seu email para ativar sua conta"
4. Redirecionar para `/login` ao invés de `/dashboard`

