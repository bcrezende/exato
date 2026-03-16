

## Badge de Alerta para Completar Cadastro

### Lógica
Verificar no `profile` do AuthContext se `full_name`, `phone` e `position` estão preenchidos. Se algum estiver vazio/null, exibir um banner de alerta no header que linka para `/settings`.

### Alterações

**`src/components/ProfileCompletionBadge.tsx`** — Novo componente:
- Usa `useAuth()` para acessar o `profile`
- Calcula campos faltantes entre `full_name`, `phone`, `position`
- Se todos preenchidos, retorna `null`
- Se faltam campos, renderiza um badge/banner com ícone de alerta, texto "Complete seu cadastro" listando os campos faltantes, e um link para `/settings`
- Usa `Alert` ou um design inline com `Badge` + `AlertTriangle` icon

**`src/components/AppLayout.tsx`** — Adicionar `<ProfileCompletionBadge />`:
- No header, entre o `SidebarTrigger` e o `NotificationBell`, ou como um banner abaixo do header
- Posição: inline no header ao lado das notificações, com estilo sutil mas visível

### Arquivos
- `src/components/ProfileCompletionBadge.tsx` — novo
- `src/components/AppLayout.tsx` — adicionar o componente no header

