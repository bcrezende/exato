

## Setor obrigatório ao enviar convite (exceto para Admin)

### Alterações em `src/pages/Team.tsx`

**1. Validação no `sendInvite`** (linha 110)
- Para roles que não são `admin`, validar que `department_id` está preenchido antes de enviar
- Managers já herdam o setor automaticamente, então não precisam selecionar
- Coordinators e outros roles não-admin devem ter setor selecionado

**2. Campo de setor no modal de convite** (atualmente oculto para managers, linha ~250)
- Atualmente o campo de setor só aparece quando `role !== "manager"` — manter esse comportamento (manager herda automaticamente)
- Tornar o campo visível e obrigatório para coordinators
- Para admin: manter o campo visível mas **opcional** (admin tem acesso full)
- Adicionar indicador visual de obrigatoriedade (asterisco) quando não é admin

**3. Lógica resumida:**
- `admin` → setor opcional
- `manager` → setor herdado do perfil (campo oculto)
- `coordinator` e outros → setor obrigatório, mostrar erro se não selecionado

### Arquivo afetado
- `src/pages/Team.tsx` — validação no `sendInvite` + UI do modal

