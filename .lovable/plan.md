

## Plano: Gráficos e Índices de Performance no Dashboard

### O que será criado

Uma nova seção "Análise de Performance" no dashboard de admin/gerente com gráficos baseados nos logs de execução (`task_time_logs`) e dados das tarefas.

### Métricas e Gráficos

**1. Tempo médio de execução por departamento (Gráfico de barras)**
- Calcula a diferença entre `started`/`started_late` e `completed` nos logs
- Agrupa por departamento para identificar gargalos

**2. Taxa de atraso por departamento (Gráfico de barras)**
- Percentual de tarefas iniciadas com atraso (`started_late`) vs total iniciadas
- Identifica setores com problemas de pontualidade

**3. Volume de tarefas concluídas por dia (Gráfico de linha — últimos 7 dias)**
- Conta logs de `completed` agrupados por dia
- Mostra tendência de produtividade

**4. Cards de índices resumidos**
- Tempo médio de execução geral
- Taxa de atraso geral (%)
- Total concluídas nos últimos 7 dias
- Departamento com maior gargalo

### Implementação

**`src/pages/Dashboard.tsx`**
- Adicionar fetch dos `task_time_logs` junto com os dados existentes
- Criar seção "Análise de Performance" abaixo das seções atuais
- Usar componentes do `recharts` (já instalado): `BarChart`, `LineChart`
- Usar `ChartContainer` e `ChartTooltipContent` de `src/components/ui/chart.tsx`
- Filtrar por departamento selecionado (reutilizar o filtro existente)
- Todos os cálculos feitos no frontend com os dados já disponíveis

### Arquivos alterados
- **`src/pages/Dashboard.tsx`** — adicionar seção de gráficos e índices

