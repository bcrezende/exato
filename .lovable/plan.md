

## Restringir Dashboard do Coordenador

### Problema

O `AdminManagerDashboard` (linhas 48-54 e 78-86) só tem tratamento especial para `manager` — o `coordinator` cai no `else` genérico e vê todos os setores e todos os analistas, igual ao admin.

### Causa raiz

1. **Filtro de departamentos** (linha 48-54): Só restringe para `role === "manager"`. Coordinator não é filtrado.
2. **Filtro de analistas** (linha 78-86): Só restringe para `role === "manager"`. Coordinator vê todos os profiles.
3. **Não busca `coordinator_analysts`**: O dashboard não consulta a tabela de vínculos, então não sabe quais analistas pertencem ao coordenador.

### Solução

**`src/pages/Dashboard.tsx`** — Adicionar lógica específica para `coordinator`:

1. **Buscar vínculos**: No `fetchData`, quando `role === "coordinator"`, buscar `coordinator_analysts` filtrando por `coordinator_id = user.id` para obter os IDs dos analistas vinculados.

2. **Filtro de departamentos**: Coordinator vê apenas seu próprio departamento (igual ao manager — usa `profile.department_id`). O select de setor fica pré-selecionado e com apenas uma opção.

3. **Filtro de analistas**: `employeeOptions` filtra `profilesList` para mostrar apenas os analistas que estão na tabela `coordinator_analysts` vinculados a este coordenador (+ o próprio coordenador).

4. **Subtítulo**: Alterar o subtítulo para "Visão da coordenação" quando `role === "coordinator"`.

### Alterações em um único arquivo

- `src/pages/Dashboard.tsx`:
  - Novo estado `coordinatorAnalystIds` (array de UUIDs)
  - No `fetchData`: se `role === "coordinator"`, buscar de `coordinator_analysts` e filtrar departamentos igual ao manager
  - No `employeeOptions`: se `role === "coordinator"`, filtrar por `coordinatorAnalystIds`
  - No subtítulo: adicionar caso para coordinator

