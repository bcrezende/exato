

## Tornar todos os cards de performance clicáveis

### Situação atual
- 4 cards: **Tempo Médio**, **Taxa de Atraso**, **Concluídas (7d)**, **Maior Gargalo**
- Apenas o "Maior Gargalo" é clicável (já tem dialog com tabela)
- Os dados para os outros 3 já estão calculados (`executionData`, `completedPerDay`, etc.)

### Alterações em `src/components/dashboard/PerformanceAnalytics.tsx`

**1. Card "Tempo Médio" — Dialog com tabela de tarefas concluídas e seus tempos**
- Estado `showAvgTime` para controlar o dialog
- Listar todas as tarefas concluídas com colunas: Tarefa, Responsável, Setor, Tempo de Execução
- Ordenar por duração decrescente
- Adicionar `cursor-pointer hover:shadow-md` ao card

**2. Card "Taxa de Atraso" — Dialog com tarefas iniciadas com atraso**
- Estado `showDelayRate` para controlar o dialog
- Listar tarefas que têm `startedLate === true` com colunas: Tarefa, Responsável, Setor
- Adicionar `cursor-pointer hover:shadow-md` ao card

**3. Card "Concluídas (7d)" — Dialog com tarefas concluídas nos últimos 7 dias**
- Estado `showCompleted7d` para controlar o dialog
- Buscar nos `filteredLogs` as tarefas com action "completed" nos últimos 7 dias, cruzar com `filteredTasks` para obter título/responsável/setor
- Colunas: Tarefa, Responsável, Setor, Data de Conclusão
- Adicionar `cursor-pointer hover:shadow-md` ao card

**4. Dados auxiliares**
- Reutilizar `profileNameMap` e `deptNameMap` já existentes
- Criar 3 novos `useMemo` para preparar os dados de cada dialog (tarefas concluídas com tempo, tarefas atrasadas, tarefas concluídas 7d)

Nenhuma alteração de banco ou em outros arquivos.

