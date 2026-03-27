

## Adicionar tooltips explicativos nos cards de KPI

### Solução

Adicionar um campo `tooltip` a cada item do array `kpiCards` com a condição que classifica a tarefa naquele estágio. Envolver cada card com o componente `Tooltip` do shadcn (já existe em `src/components/ui/tooltip.tsx`).

### Textos dos tooltips

**Auditoria:**
| Card | Tooltip |
|---|---|
| Total de Tarefas | Todas as tarefas do período selecionado |
| Não Executadas | Tarefas com status "não feita" — marcadas automaticamente quando não iniciadas até o fim do dia |
| Início Atrasado | Tarefas que foram iniciadas após o horário previsto de início |
| Concluídas Atrasadas | Tarefas concluídas após o prazo final (due_date) |
| Concluídas no Prazo | Tarefas concluídas dentro do prazo final |
| Não Concluídas | Tarefas pendentes ou em andamento cujo prazo final já passou |

**Monitoramento:**
| Card | Tooltip |
|---|---|
| Total de Tarefas | Todas as tarefas do período selecionado |
| Iniciou em Atraso | Tarefas que foram iniciadas após o horário previsto de início |
| Atrasadas | Tarefas em andamento cujo prazo final já foi ultrapassado |
| Concluídas | Tarefas finalizadas no período |
| Pendentes | Tarefas que ainda não foram iniciadas |

### Implementação

Em cada dashboard, adicionar `tooltip: string` ao array `kpiCards` e no render envolver o `Card` com `<Tooltip>` + `<TooltipTrigger>` + `<TooltipContent>`:

```tsx
<TooltipProvider>
  {kpiCards.map((kpi) => (
    <Tooltip key={kpi.label}>
      <TooltipTrigger asChild>
        <Card className="cursor-default">
          <CardContent>...</CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent><p>{kpi.tooltip}</p></TooltipContent>
    </Tooltip>
  ))}
</TooltipProvider>
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/AuditDashboard.tsx` | Adicionar tooltips aos 6 cards de KPI |
| `src/pages/Dashboard/MonitoringDashboard.tsx` | Adicionar tooltips aos 5 cards de KPI |

