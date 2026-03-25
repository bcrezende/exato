

## Modal automático de novidades com "Lido" e "Não mostrar mais"

### O que será feito

Quando o usuário faz login ou acessa a aplicação e existem novidades não lidas, um modal aparece automaticamente. Cada novidade terá um botão "Marcar como lido" individual, e o modal terá um botão "Não mostrar mais" que suprime o popup automático (o usuário ainda pode ver novidades clicando no ícone Sparkles).

### Mudanças

**1. Coluna `dismiss_whats_new` na tabela `profiles`** (migração SQL)
- Adicionar `dismiss_whats_new boolean NOT NULL DEFAULT false`
- Quando `true`, o modal automático não aparece, mas o bell continua funcionando

**2. `src/components/WhatsNewBell.tsx`**
- Adicionar lógica de auto-open: se `unreadCount > 0` e `profile.dismiss_whats_new !== true`, abrir o modal automaticamente (uma vez por sessão, usando um `useRef` para evitar loops)
- Passar prop `onDismissForever` ao dialog

**3. `src/components/WhatsNewDialog.tsx`**
- Remover o auto-mark-all-as-read ao abrir. Em vez disso, cada card de novidade não lida terá um botão "Marcar como lido" que insere em `changelog_reads` e atualiza o estado local
- Adicionar botão "Marcar todas como lidas" no footer
- Adicionar botão "Não mostrar mais" no footer que seta `profiles.dismiss_whats_new = true` e fecha o modal
- Cards lidos ficam com visual mais suave, cards não lidos ficam destacados com o botão de ação

**4. `src/integrations/supabase/types.ts`**
- Será atualizado automaticamente pela migração

### Fluxo do usuário

1. Usuário acessa o app → bell busca unread count
2. Se há novidades não lidas E `dismiss_whats_new` é `false` → modal abre automaticamente
3. Usuário pode: marcar individualmente como lido, marcar todas, ou clicar "Não mostrar mais"
4. "Não mostrar mais" desativa o popup automático, mas o bell no header continua mostrando contagem e permitindo abrir manualmente
5. Se o admin publicar uma nova novidade, o `dismiss_whats_new` é resetado para `false` para todos os perfis da empresa (via trigger SQL)

### Detalhes técnicos

**Migração SQL:**
```sql
ALTER TABLE profiles ADD COLUMN dismiss_whats_new boolean NOT NULL DEFAULT false;

-- Trigger para resetar dismiss quando nova novidade é publicada
CREATE OR REPLACE FUNCTION reset_dismiss_whats_new()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE profiles SET dismiss_whats_new = false
  WHERE company_id = NEW.company_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reset_dismiss_whats_new
AFTER INSERT ON changelog_entries
FOR EACH ROW EXECUTE FUNCTION reset_dismiss_whats_new();
```

**WhatsNewDialog — botões no footer:**
- "Marcar todas como lidas" → insere batch em `changelog_reads`, atualiza estado
- "Não mostrar mais" → `supabase.from('profiles').update({ dismiss_whats_new: true }).eq('id', user.id)`, fecha modal

**WhatsNewBell — auto-open:**
```typescript
const hasAutoOpened = useRef(false);
useEffect(() => {
  if (unreadCount > 0 && !profile?.dismiss_whats_new && !hasAutoOpened.current) {
    hasAutoOpened.current = true;
    setOpen(true);
  }
}, [unreadCount, profile?.dismiss_whats_new]);
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| Migração SQL | Coluna `dismiss_whats_new` + trigger de reset |
| `src/components/WhatsNewBell.tsx` | Auto-open do modal |
| `src/components/WhatsNewDialog.tsx` | Botões "Lido", "Marcar todas", "Não mostrar mais" |

