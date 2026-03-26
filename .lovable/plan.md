

## Corrigir erro "UPDATE requires WHERE clause" ao publicar novidade

### Causa raiz

O trigger `reset_dismiss_whats_new` executa `UPDATE profiles SET dismiss_whats_new = false;` **sem WHERE** quando `company_id IS NULL`. O Supabase Cloud bloqueia UPDATEs sem cláusula WHERE como medida de segurança, mesmo em funções SECURITY DEFINER.

### Solução

Atualizar o trigger para incluir uma cláusula WHERE explícita:

```sql
IF NEW.company_id IS NULL THEN
  UPDATE public.profiles SET dismiss_whats_new = false WHERE dismiss_whats_new = true;
ELSE
  UPDATE public.profiles SET dismiss_whats_new = false WHERE company_id = NEW.company_id AND dismiss_whats_new = true;
END IF;
```

Isso é funcionalmente equivalente (só atualiza quem precisa) e satisfaz a restrição do Supabase.

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| Migração SQL | Recriar function `reset_dismiss_whats_new` com WHERE clause |

