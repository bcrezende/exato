

## Plano: Filtrar departamentos por setor do gerente no Dashboard

### Problema
Na linha 39, o dashboard busca todos os departamentos da empresa (`departments.select("id, name")`). A RLS permite que qualquer usuário da empresa veja todos os departamentos. Para gerentes, o filtro deveria mostrar apenas o departamento deles.

### Solução

**`src/pages/Dashboard.tsx`** — filtrar departamentos quando `role === "manager"`:

Após o fetch dos departamentos, se o role for `manager`, filtrar a lista para manter apenas o departamento do perfil do usuário (`profile.department_id`). Usar o `profile` já disponível via `useAuth()`.

```ts
// Após if (depsRes.data)
if (role === "manager" && profile?.department_id) {
  setDepartments(depsRes.data.filter(d => d.id === profile.department_id));
  setSelectedDepartment(profile.department_id);
} else {
  setDepartments(depsRes.data);
}
```

Também adicionar `profile` e `role` às dependências do `useEffect`.

### Arquivos alterados
- **`src/pages/Dashboard.tsx`** — filtrar lista de departamentos para gerentes

