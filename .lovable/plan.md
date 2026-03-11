

## Plano: Restringir convite do gerente ao próprio setor

O gerente atualmente vê o seletor de setor no modal de convite, podendo escolher qualquer departamento. Deve ser restrito ao setor dele.

### Alteração em `src/pages/Team.tsx`

1. **Esconder o seletor de setor para gerentes** — quando `role === "manager"`, não exibir o campo Select de setor no modal de convite.

2. **Preencher automaticamente o `department_id`** — no `sendInvite`, se o usuário for gerente, usar `currentProfile.department_id` em vez do valor do formulário.

3. **Limitar o papel no convite** — gerentes ja só podem convidar "employee" (o SelectItem "manager" só aparece para admin), isso já está correto.

Resumo: remover o campo de seleção de setor do modal quando for gerente e forçar o `department_id` do gerente no insert.

