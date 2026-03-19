

## Adicionar Tooltips Explicativos de Cálculos nos Cards do Dashboard

### Objetivo
Exibir um balão flutuante (tooltip) ao passar o mouse sobre valores calculados (percentuais, taxas, pontuações), mostrando a fórmula usada de forma legível.

### Componentes afetados e fórmulas a documentar

| Componente | Valor | Fórmula no tooltip |
|---|---|---|
| **KpiCards** | `todayProgress%` | "Concluídas ÷ Total do dia × 100" |
| **AdminKpiCards** | `avgDelayRate%` | "Tarefas atrasadas ÷ Total de tarefas × 100" |
| **DelayKpiCards** | `startDelayPct%` | "Inícios atrasados ÷ Tarefas iniciadas × 100" |
| **DelayKpiCards** | `completionDelayPct%` | "Conclusões atrasadas ÷ Tarefas concluídas × 100" |
| **DelayKpiCards** | `overduePct%` | "Atrasadas no período ÷ Total no período × 100" |
| **TodayProgress** | `todayProgress%` | "Concluídas ÷ Total do dia × 100" |
| **SectorComparisonCard** | `onTimeRate%` | "(Total − Atrasadas) ÷ Total × 100" |
| **AdminSectorCards** | `onTimeRate%` | "Concluídas ÷ Total × 100" |
| **CoordinatorCards** | `onTimeRate%` | "(Total − Atrasadas) ÷ Total × 100" |
| **PodiumCard** | `totalPoints` | "+10 concluída, +5 no prazo, −3 atrasada, +3 alta prioridade" |
| **PerformanceAnalytics** | `delayRate%` | "Inícios atrasados ÷ Total iniciadas × 100" |
| **PerformanceAnalytics** | `avgExecution` | "Soma tempo execução ÷ Nº tarefas concluídas" |

### Abordagem técnica

1. **Criar componente reutilizável `FormulaTooltip`** em `src/components/ui/formula-tooltip.tsx`
   - Wrapper simples que usa os componentes `Tooltip`/`TooltipTrigger`/`TooltipContent` já existentes
   - Recebe `formula: string` e `children` (o elemento que recebe hover)
   - Exibe um ícone sutil de info (ℹ) ao lado do valor, ou aplica o tooltip diretamente no valor

2. **Aplicar nos 10 componentes listados** — envolver os valores percentuais/calculados com `FormulaTooltip`

### Exemplo de uso

```tsx
<FormulaTooltip formula="Concluídas ÷ Total do dia × 100">
  <span className="text-xl font-bold">{todayProgress}%</span>
</FormulaTooltip>
```

### Resultado visual
- Ao passar o mouse, aparece tooltip com fundo escuro mostrando a fórmula em texto legível
- Sem impacto visual quando não há hover — mantém a interface limpa
- Transição suave de entrada/saída (já presente no componente Tooltip existente)

### Arquivos a criar/editar
- **Criar**: `src/components/ui/formula-tooltip.tsx`
- **Editar**: `KpiCards.tsx`, `AdminKpiCards.tsx`, `DelayKpiCards.tsx`, `TodayProgress.tsx`, `SectorComparisonCard.tsx`, `AdminSectorCards.tsx`, `CoordinatorCards.tsx`, `PodiumCard.tsx`, `PerformanceAnalytics.tsx`

