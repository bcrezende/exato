

## Plano: Adicionar seletor de setor no formulário de tarefas

### Alterações em `src/pages/Tasks.tsx`

1. **Adicionar state para departamentos** — buscar departamentos da empresa (`supabase.from("departments").select("*").eq("company_id", ...)`)

2. **Adicionar `department_id` ao form state** — inicializar com `""`, preencher com valor existente ao editar

3. **Adicionar campo Select no formulário** — visível para admins, mostrando todos os setores da empresa. Para managers, manter o comportamento atual (herda o próprio setor).

4. **Ajustar `handleSave`** — usar `form.department_id` quando preenchido (admin), senão usar `currentProfile.department_id`

5. **Exibir nome do setor na lista de tarefas** — mostrar badge com o nome do departamento associado

### Sem alterações de banco/RLS
A tabela `tasks` já tem `department_id` e as políticas existentes já permitem admins criarem/editarem tarefas em qualquer setor.

