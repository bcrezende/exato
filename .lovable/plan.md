

## Limpar Notificações + Traduzir Status

### 1. Botão "Limpar todas" no NotificationBell

**`src/components/NotificationBell.tsx`**:
- Adicionar função `clearAll` que faz `DELETE` de todas as notificações do usuário (não apenas marcar como lidas)
- Adicionar botão "Limpar todas" (ícone Trash2) no header do popover, ao lado do "Marcar todas como lidas"
- Exibir o botão sempre que houver notificações (não apenas não-lidas)

### 2. Traduzir status nas notificações (trigger do banco)

**Migração SQL** — Alterar a função trigger `notify_task_changes` para traduzir o status antes de inserir:
- Criar um bloco `CASE` que mapeia os valores do enum para português:
  - `pending` → `Pendente`
  - `in_progress` → `Em andamento`
  - `completed` → `Concluída`
  - `overdue` → `Atrasada`
- A mensagem passará de `TAREFA TESTE → in_progress` para `TAREFA TESTE → Em andamento`

### 3. Tradução client-side (fallback para notificações existentes)

**`src/components/NotificationBell.tsx`**:
- Adicionar função `translateMessage` que faz replace das strings brutas (`in_progress`, `pending`, etc.) por versões traduzidas na exibição da mensagem
- Aplicar no render da mensagem para corrigir notificações já existentes no banco

### Arquivos
| Arquivo | Ação |
|---------|------|
| `src/components/NotificationBell.tsx` | Botão limpar + tradução client-side |
| Migração SQL | Atualizar trigger com CASE para traduzir status |

