

## Problema: Email de convite não é enviado

### Causa raiz

A função `sendInvite` em `Team.tsx` (linha 109-124) apenas **insere um registro na tabela `invitations`** — ela não dispara nenhum email. O link de convite é gerado no frontend via `getInviteLink()` mas nunca é enviado ao destinatário.

O template de email de convite (`invite.tsx`) já existe, mas ele só é usado pelo `auth-email-hook`, que processa eventos de autenticação do Supabase (signup, recovery, etc.). Convites customizados não são eventos de auth, então o hook nunca é acionado.

Não existe uma Edge Function de email transacional (`send-transactional-email`) no projeto.

### Plano de correção

**1. Criar Edge Function `send-invite-email`**
- Nova função em `supabase/functions/send-invite-email/index.ts`
- Recebe `invitation_id` como parâmetro
- Busca os dados do convite (email, token, empresa) do banco usando service role
- Renderiza o template `InviteEmail` com o link correto (`{origin}/accept-invite?token={token}`)
- Enfileira o email via `enqueue_email` RPC na fila `transactional_emails` (infraestrutura de fila já existe)
- Valida JWT do chamador para garantir que é um usuário autenticado da mesma empresa

**2. Atualizar `Team.tsx` — chamar a Edge Function após inserir o convite**
- Após o `insert` bem-sucedido na tabela `invitations`, buscar o registro recém-criado para obter o `id`
- Chamar `supabase.functions.invoke("send-invite-email", { body: { invitation_id } })`
- Manter o toast de sucesso, mas agora refletir que o email foi enviado

**3. Registrar a função no `config.toml`**
- Adicionar `[functions.send-invite-email]` com `verify_jwt = false` (validação feita no código)

### Arquivos afetados
- `supabase/functions/send-invite-email/index.ts` — nova Edge Function
- `src/pages/Team.tsx` — chamar a função após criar convite
- `supabase/config.toml` — registrar a nova função

### Observação
O template `invite.tsx` já está pronto e estilizado. A infraestrutura de fila de emails (`enqueue_email`, `process-email-queue`, cron job) já existe. Só falta conectar o fluxo de convite ao envio de email.

