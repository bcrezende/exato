

## Tornar o card "Maior Gargalo" clicável com lista de tarefas gargalo

### O que muda

O card "Maior Gargalo" passa a ser clicável. Ao clicar, abre um **Dialog** listando **todas as tarefas com overflow** (tempo real > tempo planejado), ordenadas do maior excesso para o menor — não apenas a pior.

### Alterações

**`src/components/dashboard/PerformanceAnalytics.tsx`:**

1. **Novo `useMemo`**: Calcular lista `bottleneckTasks` — todas as tarefas com overflow positivo, incluindo título, duração real, duração planejada e overflow. Ordenar por overflow decrescente.

2. **Estado `showBottlenecks`**: Controlar abertura/fechamento do Dialog.

3. **Card clicável**: Adicionar `cursor-pointer hover:shadow-md transition-shadow` ao card e `onClick` para abrir o dialog (só quando há gargalos).

4. **Dialog**: Mostrar uma tabela com colunas:
   - Tarefa (título)
   - Tempo Real
   - Tempo Previsto
   - Excesso
   
   Usar os componentes `Dialog`, `Table` já existentes no projeto.

5. **Imports adicionais**: `Dialog, DialogContent, DialogHeader, DialogTitle` e `Table, TableHeader, TableBody, TableRow, TableHead, TableCell`.

Nenhuma alteração de banco necessária.

