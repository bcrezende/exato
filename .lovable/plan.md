

## Corrigir filtros do dashboard para Gerentes

### Problema
O gerente consegue selecionar "Todos os setores" no filtro de departamento (linha 196), o que limpa o `selectedDepartment` e mostra tarefas/analistas de outros setores. A lista de departamentos é corretamente filtrada (linhas 52-53), mas a opção "all" ainda aparece no Select.

### Solução em `src/pages/Dashboard.tsx`

**1. Ocultar opção "Todos os setores" para gerentes e coordenadores** (linha 196)
- Mostrar `<SelectItem value="all">` apenas quando `role === "admin"`

**2. Desabilitar o seletor de departamento para gerentes e coordenadores** (linha 191)
- Adicionar `disabled` ao `SelectTrigger` quando o role é `manager` ou `coordinator`, já que o setor é fixo

Essas duas mudanças garantem que o gerente não consiga contornar o filtro de setor.

### Arquivo afetado
- `src/pages/Dashboard.tsx`

