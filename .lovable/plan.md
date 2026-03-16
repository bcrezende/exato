

## Adicionar filtro de funcionário no Dashboard

### Alterações em `src/pages/Dashboard.tsx`

1. **Novo state**: `selectedEmployee` (string | null)
2. **Lista de membros filtrada**: Derivar do `profiles` Map, filtrando pelo departamento selecionado quando aplicável. Para gerentes, mostrar apenas membros do seu setor.
3. **Novo Select** ao lado do filtro de departamento, com ícone `User` e opções "Todos os funcionários" + lista de nomes
4. **Atualizar `filteredTasks`**: Além do filtro por departamento, aplicar filtro por `assigned_to === selectedEmployee`
5. **Reset do filtro de funcionário** quando o departamento mudar (para evitar inconsistência)

### Detalhes

- O `profiles` já é carregado com `id` e `full_name` — basta armazenar o array original além do Map para popular o select
- Adicionar um state `profilesList` (array de `{ id, full_name, department_id }`) buscando também `department_id` na query de profiles
- Quando `selectedDepartment` muda, resetar `selectedEmployee` para null
- Filtrar a lista de funcionários no select pelo departamento selecionado (se houver)

### Arquivo
- `src/pages/Dashboard.tsx` — adicionar state, ajustar fetch, adicionar select no header, atualizar `filteredTasks`

