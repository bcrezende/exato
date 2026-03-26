

## Sistema de Novidades Global com Super Admin (is_master)

### Resumo

Adicionar flag `is_master` na tabela `profiles` para identificar o super administrador. Tornar o sistema de novidades global (sem vínculo com empresa). Somente usuários com `is_master = true` poderão criar/gerenciar entradas de changelog. A aba "Novidades" nas configurações só aparece para masters.

### Mudanças

**1. Migração SQL**

- Adicionar coluna `is_master boolean DEFAULT false` na tabela `profiles`
- Tornar `company_id` nullable em `changelog_entries`
- Atualizar RLS de `changelog_entries`:
  - SELECT: qualquer `authenticated` pode ler (sem filtro de empresa)
  - INSERT/UPDATE/DELETE: apenas `is_master = true` (via security definer function)
- Criar function `is_master(_user_id uuid)` (security definer) que verifica `profiles.is_master`
- Atualizar trigger `reset_dismiss_whats_new`: quando `company_id IS NULL`, resetar **todos** os perfis
- Setar `is_master = true` no seu usuário (qual email?)

**2. `src/contexts/AuthContext.tsx`**

- Incluir `is_master` no profile fetch para que fique disponível no contexto

**3. `src/components/settings/WhatsNewAdmin.tsx`**

- Remover `company_id` do insert (criar sem empresa = global)
- Remover filtro `.eq("company_id", ...)` da listagem

**4. `src/components/WhatsNewBell.tsx`**

- Remover filtro `.eq("company_id", ...)` da contagem de não lidos

**5. `src/components/WhatsNewDialog.tsx`**

- Remover filtro `.eq("company_id", ...)` da listagem de entradas

**6. `src/pages/Settings.tsx`**

- Trocar condição da aba "Novidades" de `role === "admin"` para `profile?.is_master === true`

### Detalhes técnicos

```sql
-- Nova coluna
ALTER TABLE profiles ADD COLUMN is_master boolean NOT NULL DEFAULT false;

-- Security definer
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_master FROM profiles WHERE id = _user_id), false)
$$;

-- Atualizar RLS changelog_entries
ALTER TABLE changelog_entries ALTER COLUMN company_id DROP NOT NULL;
DROP POLICY IF EXISTS "Admins can insert changelog entries" ON changelog_entries;
DROP POLICY IF EXISTS "Admins can update changelog entries" ON changelog_entries;
DROP POLICY IF EXISTS "Admins can delete changelog entries" ON changelog_entries;
DROP POLICY IF EXISTS "Users can view changelog entries in own company" ON changelog_entries;

CREATE POLICY "Anyone authenticated can view changelog" ON changelog_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Masters can insert changelog" ON changelog_entries FOR INSERT TO authenticated WITH CHECK (is_master(auth.uid()));
CREATE POLICY "Masters can update changelog" ON changelog_entries FOR UPDATE TO authenticated USING (is_master(auth.uid()));
CREATE POLICY "Masters can delete changelog" ON changelog_entries FOR DELETE TO authenticated USING (is_master(auth.uid()));

-- Atualizar trigger para reset global
CREATE OR REPLACE FUNCTION public.reset_dismiss_whats_new()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    UPDATE profiles SET dismiss_whats_new = false;
  ELSE
    UPDATE profiles SET dismiss_whats_new = false WHERE company_id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| Migração SQL | `is_master` coluna, `is_master()` function, RLS global, trigger atualizado |
| `src/contexts/AuthContext.tsx` | Expor `is_master` do profile |
| `src/components/WhatsNewBell.tsx` | Remover filtro company_id |
| `src/components/WhatsNewDialog.tsx` | Remover filtro company_id |
| `src/components/settings/WhatsNewAdmin.tsx` | Remover company_id do insert e listagem |
| `src/pages/Settings.tsx` | Aba "Novidades" visível só para `is_master` |
| Insert SQL | Setar `is_master = true` no seu usuário |

