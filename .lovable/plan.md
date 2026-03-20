

## Permitir Analistas Editarem Tarefas Atribuídas a Eles

### Problema

No `TaskDetailModal`, os botões "Editar" e "Excluir" só aparecem quando `canManage || isCreator` (linha 311). Analistas que receberam tarefas de gestores não são criadores nem gestores, então não veem o botão de editar.

### Correção

**Arquivo:** `src/components/tasks/TaskDetailModal.tsx`

1. Alterar a condição da linha 311 de:
   ```typescript
   {(canManage || isCreator) && (
   ```
   Para:
   ```typescript
   {(canManage || isCreator || isAssigned) && (
   ```

2. Para manter segurança, mostrar apenas o botão "Editar" para analistas atribuídos (sem "Excluir"), já que a exclusão por analistas não-criadores pode não ser desejada. A lógica ficaria:
   - Botão **Editar**: visível para `canManage || isCreator || isAssigned`
   - Botão **Excluir**: visível apenas para `canManage || isCreator` (mantém como está)

### Nota sobre RLS

A policy UPDATE da tabela `tasks` já permite `assigned_to = auth.uid()`, então o backend já aceita a atualização. Só falta liberar o botão no frontend.

