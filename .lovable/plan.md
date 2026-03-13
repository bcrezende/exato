

## Alterar "Maior Gargalo" de setor para tarefa

### Problema
O card "Maior Gargalo" mostra o departamento com maior tempo médio de execução, mas isso é redundante — o filtro de departamento no topo já faz essa segmentação. O ideal é mostrar a **tarefa** com maior tempo de execução (ou ainda em andamento há mais tempo).

### Solução

**`src/components/dashboard/PerformanceAnalytics.tsx`**:

1. No `summary` (useMemo, ~linha 160-175), substituir `worstDept` por `worstTask`:
   - Buscar nos `executionData` a tarefa com maior `duration` (concluída) ou, entre as ainda em andamento (duration === 0 com startLog), calcular tempo desde o início
   - Cruzar com `filteredTasks` para obter o `title` da tarefa

2. No card "Maior Gargalo" (~linha 240-251):
   - Exibir o **título da tarefa** (truncado) em vez do nome do departamento
   - Manter o subtítulo com a duração formatada

### Resultado
- Admin/Manager filtra o setor no topo → card mostra qual tarefa específica daquele setor é o maior gargalo
- Sem filtro → mostra a tarefa mais demorada de toda a empresa

