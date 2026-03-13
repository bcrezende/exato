

## Transformar a view "Lista" em formato de tabela estilo Excel

### O que muda

Substituir os cards empilhados (linhas 341-393 de `src/pages/Tasks.tsx`) por uma tabela HTML usando os componentes `Table` já existentes no projeto (`src/components/ui/table.tsx`), com `ScrollArea` para scroll horizontal em telas menores.

### Estrutura da tabela

| Tarefa | Status | Departamento | Recorrência | Responsável | Início | Término | Ações |
|--------|--------|-------------|-------------|-------------|--------|---------|-------|

- Linhas clicáveis (abre o detalhe da tarefa)
- Hover com destaque na linha
- Badges de status e departamento mantidos
- Coluna "Ações" com botões Iniciar/Concluir (funcionário) e Editar/Excluir (admin/manager)
- Responsiva com scroll horizontal via `ScrollArea`

### Arquivo alterado
- **`src/pages/Tasks.tsx`** — linhas 340-393: substituir o bloco `viewMode === "list"` pelos componentes `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`

