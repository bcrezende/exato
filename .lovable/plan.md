

## Corrigir card "Não Concluídas" contando tarefas cujo prazo ainda não venceu

### Causa raiz

A tarefa "PLANILHA DE RECUSA" (due_date: 25/03 17:15, status: pending) aparece como "Não Concluída" porque a lógica compara `due_date < periodEndISO`, onde `periodEndISO` é o final do dia (23:59:59). Como 17:15 < 23:59, a tarefa é incluída, mesmo que o prazo ainda não tenha passado.

O filtro deveria usar o **momento atual** como corte (não o fim do período), pois uma tarefa só é "não concluída" se seu prazo **já passou**.

### Correção

Nos dois locais (AdminOverviewCards e drillDownTasks no AdminDashboard), trocar a referência de corte:

- Para o período "hoje": usar `nowAsFakeUTC()` em vez de `periodEndISO`
- Para períodos passados (ontem, semana passada, etc.): `periodEndISO` já está correto

A lógica final: `due_date < min(periodEndISO, nowAsFakeUTC())`

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `AdminOverviewCards.tsx` | Adicionar prop `nowISO` e usar `Math.min` entre `periodEndISO` e `nowISO` no filtro `notCompleted` |
| `AdminDashboard.tsx` | Calcular `nowISO = nowAsFakeUTC()` e passar para `AdminOverviewCards` e usar no `drillDownTasks` case `notCompleted` |

### Detalhes técnicos

**AdminOverviewCards.tsx** — nova prop e filtro corrigido:
```typescript
interface AdminOverviewCardsProps {
  // ...existing props
  nowISO: string; // novo
}

// No cálculo de notCompleted:
const cutoff = nowISO < periodEndISO ? nowISO : periodEndISO;
const notCompleted = periodTasks.filter(
  t => t.status !== "completed" && t.status !== "in_progress" && t.due_date && t.due_date < cutoff
).length;
```

**AdminDashboard.tsx** — passar nowISO e corrigir drillDown:
```typescript
import { nowAsFakeUTC } from "@/lib/date-utils";

const nowISO = nowAsFakeUTC();

// No AdminOverviewCards:
<AdminOverviewCards ... nowISO={nowISO} />

// No drillDownTasks case "notCompleted":
const cutoff = nowISO < cutoffISO ? nowISO : cutoffISO;
return periodTasks.filter(t => t.status !== "completed" && t.status !== "in_progress" && t.due_date && t.due_date < cutoff);
```

Nenhuma migração necessária.

