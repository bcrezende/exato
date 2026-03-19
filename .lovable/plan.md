

## Corrigir visibilidade de todos os usuários para Admin na tela "Minha Equipe"

### Problema

Na linha 62-65 do `TeamMonitoring.tsx`, o admin busca apenas usuários com role `analyst` na tabela `user_roles`. Isso exclui gerentes, coordenadores e outros membros da empresa.

### Solução

Para o admin, buscar **todos os profiles da empresa** diretamente, sem filtrar por role. O manager continua filtrando por departamento, e o coordinator pelos vínculos.

### Arquivo a editar

`src/pages/TeamMonitoring.tsx`

### Mudança (linhas 60-81)

Substituir a lógica do bloco `else` (admin/manager):

```typescript
} else {
  if (role === "manager") {
    // Manager: get analysts in own department
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "analyst");
    const roleUserIds = (roles || []).map((r) => r.user_id);

    const { data: companyProfiles } = await supabase
      .from("profiles")
      .select("id, department_id")
      .eq("company_id", companyId)
      .in("id", roleUserIds);

    analystIds = (companyProfiles || [])
      .filter((p) => p.department_id === profile!.department_id)
      .map((p) => p.id);
  } else {
    // Admin: get ALL company members (except self)
    const { data: companyProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("company_id", companyId)
      .neq("id", user!.id);

    analystIds = (companyProfiles || []).map((p) => p.id);
  }
}
```

Isso remove o filtro por role para admins, garantindo que todos os membros da empresa apareçam no monitoramento.

