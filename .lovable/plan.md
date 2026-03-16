

## Correção do Offset no Drag-and-Drop do Kanban

### Problema
Quando o usuário arrasta um card, ele "pula" para baixo em vez de ficar na posição do mouse. Isso acontece porque o `@hello-pangea/dnd` calcula coordenadas relativas ao container scrollável (`<main className="overflow-auto">`), causando um offset incorreto.

### Causa raiz
O elemento `<main>` no `AppLayout.tsx` tem `overflow-auto`, criando um contexto de scroll próprio. O `@hello-pangea/dnd` não compensa corretamente esse scroll ao posicionar o item arrastado.

### Solução
Usar um **portal** para renderizar o card sendo arrastado diretamente no `document.body`, eliminando qualquer offset de scroll do container pai.

### Alterações

**`src/pages/Tasks.tsx`**:
- Criar um componente helper `PortalAwareDraggableCard` que, quando `dragSnapshot.isDragging` é `true`, renderiza o card dentro de `ReactDOM.createPortal(child, document.body)` — tirando-o do fluxo do container scrollável
- Quando não está arrastando, renderiza normalmente no fluxo
- Importar `createPortal` de `react-dom`

A lógica é simples: envolver o conteúdo do `Draggable` render prop num portal condicional:

```
if (dragSnapshot.isDragging) {
  return createPortal(cardElement, document.body);
}
return cardElement;
```

### Arquivos alterados
- `src/pages/Tasks.tsx` — adicionar portal condicional no Draggable

