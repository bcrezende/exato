

## Permitir admin convidar/promover para papel admin

### Alterações

1. **`src/pages/Team.tsx`** (modal de convite, ~linha 315): Adicionar opção "Admin" no select de papel quando o usuário logado é admin:
   ```
   {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
   {isAdmin && <SelectItem value="manager">Gerente</SelectItem>}
   <SelectItem value="employee">Funcionário</SelectItem>
   ```

2. **`src/components/team/EditMemberDialog.tsx`**: O select de papel já inclui "admin" como opção — já funciona. Nenhuma alteração necessária.

3. **Banco de dados / RLS**: Já permite — a política de INSERT em `user_roles` autoriza admins, e a de INSERT em `invitations` também. A função `handle_accept_invite` usa SECURITY DEFINER e aceita qualquer role válida do enum. Nenhuma migração necessária.

Escopo mínimo: apenas adicionar `<SelectItem value="admin">Admin</SelectItem>` no modal de convite.

