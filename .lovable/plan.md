

## Diagnóstico

1. **Trigger `on_auth_user_created`** foi criado no schema `auth` (reservado), então não foi aplicado. Resultado: nenhum registro existe na tabela `profiles`.
2. **`handle_registration`** faz `UPDATE profiles SET ...` mas como o perfil nunca foi criado, o UPDATE afeta 0 linhas.
3. Sem perfil com `company_id`, as funções `get_user_company_id()` retornam NULL, quebrando todas as políticas RLS que dependem dela (setores, tarefas, etc).

## Solução

### 1. Migração SQL
Corrigir a função `handle_registration` para fazer `INSERT ... ON CONFLICT` no profiles ao invés de UPDATE:

```sql
CREATE OR REPLACE FUNCTION public.handle_registration(_user_id uuid, _company_name text, _full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
BEGIN
  INSERT INTO public.companies (name) VALUES (_company_name) RETURNING id INTO _company_id;
  
  INSERT INTO public.profiles (id, company_id, full_name)
  VALUES (_user_id, _company_id, _full_name)
  ON CONFLICT (id) DO UPDATE SET company_id = _company_id, full_name = _full_name;
  
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
```

### 2. Corrigir dados existentes
Inserir o perfil do usuário atual que está sem dados, vinculando à empresa já criada.

### 3. Atualizar políticas RLS de `profiles`
A política de INSERT atual (`id = auth.uid()`) impede a criação pelo `handle_new_user`. Precisamos manter a política `WITH CHECK (true)` (que já existe como "System can create profiles") — esta parte está OK, era o trigger no schema reservado o problema.

### 4. Sem alterações no frontend
O código do frontend está correto. O problema é exclusivamente de dados/backend.

