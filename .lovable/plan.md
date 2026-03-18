

## Reestruturar página de Tarefas

### 1. Header Compacto
- Remover subtítulo "Gerencie as tarefas da sua equipe"
- View toggles: trocar botões com texto por ícones segmentados (apenas `LayoutGrid`, `List`, `CalendarDays`) sem labels
- Botão "Importar Excel" mudar para `variant="ghost"` ou `variant="outline"` discreto
- "Nova Tarefa" permanece como único botão `variant="default"`

### 2. Barra de Filtros com Popover
- Manter apenas o campo de busca visível permanentemente
- Substituir os 5 selects expostos por um botão "Filtros" com ícone `Filter`
- Badge no botão mostrando quantidade de filtros ativos (excluindo busca e data padrão)
- Ao clicar, abrir `Popover` com os filtros organizados em grid 2 colunas:
  - Col 1: Status, Setor, Responsável
  - Col 2: Recorrência, Data
  - Botão "Limpar filtros" no rodapé do popover
- Todos os selects com largura uniforme (`w-full` dentro do popover)

### 3. Kanban Mais Limpo
- Colunas: reduzir padding de `p-3` para `p-2` no header
- Cards: `CardContent` de `p-4 space-y-3` para `p-3 space-y-2`
- Remover bloco de descrição (`task.description`)
- Remover bloco de data (`Clock` + `due_date`)
- Card mostra apenas: título, badge de status e avatar/nome do responsável numa linha
- Manter quick actions (Iniciar/Concluir/Edit/Delete) inalterados

### 4. Correções Técnicas
- Verificar e remover imports duplicados de `Popover` (se houver)
- Imports não utilizados serão limpos naturalmente com as mudanças

### Arquivo afetado
- `src/pages/Tasks.tsx` — único arquivo a modificar

