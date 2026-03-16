

## Reformular o card "Maior Gargalo"

### Problema atual
O card apenas mostra a tarefa com maior tempo de execução absoluto (diferença entre log "started" e "completed"). Não considera o prazo planejado (diferença entre `start_date` e `due_date`) para avaliar se a tarefa **excedeu** o tempo esperado.

### Nova lógica

1. **Tempo planejado** = `due_date - start_date` (da tabela `tasks`)
2. **Tempo real** = `completed_at - started_at` (dos `task_time_logs`)
3. **Excesso** = `tempo real - tempo planejado` (só positivo = atrasou)
4. O "Maior Gargalo" passa a ser a tarefa com **maior excesso** de tempo, não maior tempo absoluto

### Alterações no card

- Mostrar o título da tarefa
- Linha 1: tempo real de execução
- Linha 2: quanto excedeu o prazo planejado (ex: "+2h 30min além do previsto")
- Se nenhuma tarefa excedeu o prazo, mostrar "Nenhum gargalo" com estilo neutro

### Arquivo alterado
- `src/components/dashboard/PerformanceAnalytics.tsx` — alterar o cálculo do `worstTask` no `summary` useMemo (linhas 172-181) e o render do card (linhas 249-260)

### Detalhes técnicos

No `summary` useMemo, para cada item em `executionData` com `duration > 0`:
- Buscar a task correspondente em `filteredTasks`
- Calcular `plannedDuration = due_date - start_date` (se ambas existirem)
- Calcular `overflow = duration - plannedDuration`
- Selecionar a tarefa com maior `overflow > 0`

O tipo `worstTask` muda para `{ title, duration, plannedDuration, overflow }`.

