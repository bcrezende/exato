

## Adicionar Drag and Drop no Kanban

### Abordagem
Usar a biblioteca `@hello-pangea/dnd` (fork mantido do `react-beautiful-dnd`) para permitir arrastar cards entre colunas do Kanban, atualizando o status da tarefa automaticamente.

### Regras de negócio (baseadas na lógica existente)
- Arrastar para **Pendente** → status `pending`
- Arrastar para **Em Andamento** → status `in_progress`
- Arrastar para **Concluída** → status `completed` (dispara geração de recorrente)
- Arrastar para **Atrasada** → bloqueado (coluna calculada, não é um status direto)
- Permissão: admins/managers podem arrastar qualquer tarefa; employees só as próprias

### Alterações

**1. Instalar dependência**
- `@hello-pangea/dnd` — biblioteca de drag-and-drop para React

**2. `src/pages/Tasks.tsx`** — Refatorar a seção Kanban:
- Envolver o grid de colunas com `<DragDropContext onDragEnd={handleDragEnd}>`
- Cada coluna vira um `<Droppable droppableId={status}>` (coluna "overdue" com `isDropDisabled={true}`)
- Cada card vira um `<Draggable draggableId={task.id} index={i}>` (com `isDragDisabled` para employees em tarefas de outros)
- Criar `handleDragEnd` que:
  - Mapeia `droppableId` destino para o status correto
  - Chama `handleStatusChange(taskId, newStatus)` existente
  - Aplica atualização otimista (reordena visualmente antes da resposta do servidor)

### Arquivos alterados
- `package.json` — nova dependência
- `src/pages/Tasks.tsx` — DragDropContext, Droppable, Draggable no Kanban

