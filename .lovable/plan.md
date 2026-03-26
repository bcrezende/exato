

## Corrigir exposição pública da tabela invitations

### Problema

As policies `Anyone can view invitation by token` e `Anyone can update invitation to accept` usam role `public` (não autenticado), expondo **todos** os convites pendentes para qualquer visitante anônimo.

### Solução

O fluxo de aceitar convite acontece **antes** do signup — o usuário ainda não está autenticado. Portanto não podemos exigir `authenticated`. A solução é:

1. **Criar uma função `get_invitation_by_token`** (SECURITY DEFINER) que recebe o token e retorna apenas aquele convite específico. Isso evita expor todos os registros.

2. **Remover as policies públicas** de SELECT e UPDATE da tabela `invitations`.

3. **Atualizar `AcceptInvite.tsx`** para usar `supabase.rpc("get_invitation_by_token", { _token })` em vez de query direta à tabela.

4. **O `handle_accept_invite`** já é SECURITY DEFINER e faz o UPDATE internamente, então não precisa de policy pública de UPDATE.

### Detalhes técnicos

**Migração SQL:**
```sql
-- Função segura para buscar convite por token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token uuid)
RETURNS TABLE(id uuid, email text, token uuid, company_id uuid, 
              department_id uuid, role app_role, company_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT i.id, i.email, i.token, i.company_id, i.department_id, i.role,
           c.name AS company_name
    FROM invitations i
    LEFT JOIN companies c ON c.id = i.company_id
    WHERE i.token = _token AND i.accepted_at IS NULL;
END;
$$;

-- Remover policies públicas inseguras
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON invitations;
DROP POLICY IF EXISTS "Anyone can update invitation to accept" ON invitations;
```

**`AcceptInvite.tsx`:** Trocar query direta por `supabase.rpc("get_invitation_by_token", { _token: token })`.

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| Migração SQL | Criar `get_invitation_by_token`, remover 2 policies públicas |
| `src/pages/AcceptInvite.tsx` | Usar RPC em vez de query direta |

