

## Ajustar Label Dinâmico do Card "Atrasadas Hoje"

### Mudança

Passar o `period` selecionado para `AdminKpiCards` e usar um label dinâmico:
- `"Atrasadas Hoje"` quando period = `"today"`
- `"Atrasadas Ontem"` quando period = `"yesterday"`
- `"Atrasadas no Período"` para qualquer outro período

### Arquivos

| Arquivo | Mudança |
|---|---|
| `AdminKpiCards.tsx` | Nova prop `period: string`; label condicional no card de atrasadas |
| `AdminDashboard.tsx` | Passar `period={period}` ao componente |

### Detalhe Técnico

```typescript
// AdminKpiCards.tsx
interface AdminKpiCardsProps {
  activeSectors: number;
  totalTasks: number;
  overdueTasks: number;
  avgDelayRate: number;
  period: string; // novo
}

// No array de cards:
const overdueLabel = period === "today" ? "Atrasadas Hoje"
  : period === "yesterday" ? "Atrasadas Ontem"
  : "Atrasadas no Período";

{ label: overdueLabel, value: overdueTasks, ... }
```

