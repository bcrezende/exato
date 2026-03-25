

## Sistema de Novidades e Changelog

### Conceito

Um sistema "What's New" onde o admin pode publicar avisos de novidades/mudanças para todos os usuários da empresa. Os usuários veem um indicador no header e um modal/painel com as novidades não lidas.

### Arquitetura

**Nova tabela `changelog_entries`** — armazena as novidades publicadas pelo admin:
- `id`, `company_id`, `title`, `content` (texto markdown/plain), `category` (enum: `feature`, `improvement`, `fix`, `announcement`), `created_by`, `created_at`

**Nova tabela `changelog_reads`** — registra quais usuários já leram cada entrada:
- `id`, `user_id`, `changelog_id`, `read_at`

Isso permite saber quantas novidades cada usuário ainda não leu.

### Componentes

| Componente | Descrição |
|---|---|
| `WhatsNewBell` | Botão no header (ao lado do NotificationBell) com ícone `Sparkles`, badge com contagem de não lidas |
| `WhatsNewDialog` | Dialog/Sheet que lista as novidades em cards, com título, categoria (badge colorido), data e conteúdo. Marca como lido ao abrir |
| `WhatsNewAdmin` | Seção na página Settings (apenas admin) para criar/editar/excluir entradas de changelog |

### Fluxo

1. Admin acessa Settings → aba "Novidades" → cria uma entrada com título, conteúdo e categoria
2. A entrada é salva em `changelog_entries` com o `company_id` do admin
3. Todos os usuários da empresa veem o badge com contagem de não lidas no `WhatsNewBell`
4. Ao clicar, abre o `WhatsNewDialog` listando as novidades (mais recentes primeiro)
5. Ao abrir, insere registros em `changelog_reads` para marcar como lidas
6. Badge atualiza em tempo real via realtime no `changelog_entries`

### Mudanças por arquivo

| Arquivo | Mudança |
|---|---|
| **Migração SQL** | Criar tabelas `changelog_entries` e `changelog_reads` com RLS, enum `changelog_category`, realtime |
| `src/components/WhatsNewBell.tsx` | Novo — ícone Sparkles + badge + popover/dialog com lista de novidades |
| `src/components/WhatsNewDialog.tsx` | Novo — lista de cards de novidades com scroll, categorias coloridas, "marcar todas como lidas" |
| `src/components/AppLayout.tsx` | Adicionar `WhatsNewBell` ao header, ao lado do `NotificationBell` |
| `src/pages/Settings.tsx` | Adicionar aba "Novidades" para admins criarem/editarem entradas |

### Detalhes técnicos

**Migração:**
```sql
CREATE TYPE changelog_category AS ENUM ('feature','improvement','fix','announcement');

CREATE TABLE changelog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category changelog_category NOT NULL DEFAULT 'feature',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE changelog_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changelog_id uuid NOT NULL REFERENCES changelog_entries(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, changelog_id)
);

-- RLS: entries visíveis por empresa, inserção/update/delete apenas admin
-- RLS: reads inserção pelo próprio user, select pelo próprio user

ALTER PUBLICATION supabase_realtime ADD TABLE changelog_entries;
```

**WhatsNewBell** — query para contar não lidas:
```typescript
const { count } = await supabase
  .from("changelog_entries")
  .select("id", { count: "exact", head: true })
  .eq("company_id", profile.company_id)
  .not("id", "in", `(${readIds.join(",")})`);
```

**Categorias visuais:**
- `feature` → badge azul "Novidade"
- `improvement` → badge verde "Melhoria"  
- `fix` → badge laranja "Correção"
- `announcement` → badge roxo "Comunicado"

