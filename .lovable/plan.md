

## Corrigir offset de 3h na classificação de atrasadas e nos logs de tempo

### Causa raiz — dois bugs com a mesma origem

O projeto armazena datas como "fake UTC" (hora local com +00:00), mas em dois pontos o código usa timestamps em UTC real, causando um deslocamento de 3 horas (fuso do Brasil):

**Bug 1 — Período do AdminDashboard usa UTC real**

```typescript
const periodStartISO = periodStart.toISOString();  // "2026-03-26T03:00:00.000Z" ← UTC real
const periodEndISO = periodEnd.toISOString();       // "2026-03-27T02:59:59.999Z"
```

Mas as datas das tarefas são fake UTC: `"2026-03-26T09:00:00+00:00"`. A comparação string entre formatos diferentes (Z vs +00:00) causa inclusões/exclusões incorretas. Tarefas de hoje podem ser comparadas contra um range que começa às 03:00 ao invés de 00:00.

**Bug 2 — Time logs salvos com `created_at = now()` (UTC real)**

O insert em `task-utils.ts` não especifica `created_at`, então usa o default `now()` do servidor (UTC real). Quando exibido com `formatStoredDate` (que lê componentes UTC), o horário fica +3h adiantado.

### Solução

**1. `src/pages/Dashboard/AdminDashboard.tsx`** — Converter periodStart/periodEnd para fake UTC

Substituir:
```typescript
const periodStartISO = periodStart.toISOString();
const periodEndISO = periodEnd.toISOString();
```

Por uma conversão que gera strings fake UTC a partir da data local:
```typescript
function toFakeUTC(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${mi}:${s}+00:00`;
}

const periodStartISO = toFakeUTC(periodStart);
const periodEndISO = toFakeUTC(periodEnd);
```

Isso garante que "início do dia" = `T00:00:00+00:00` e "fim do dia" = `T23:59:59+00:00`, compatível com o formato das tarefas.

**2. `src/lib/date-utils.ts`** — Exportar `toFakeUTC` como utilidade reutilizável

Adicionar a função `toFakeUTC(d: Date): string` para uso em todos os dashboards.

**3. `src/lib/task-utils.ts`** — Salvar time logs com timestamp fake UTC

No insert de `task_time_logs`, passar `created_at: nowAsFakeUTC()` explicitamente:
```typescript
import { nowAsFakeUTC } from "@/lib/date-utils";

supabase.from("task_time_logs").insert({
  task_id: taskId,
  user_id: userId,
  action,
  created_at: nowAsFakeUTC(),
}).then(() => {});
```

**4. Verificar outros dashboards** — Aplicar a mesma correção onde `toISOString()` é usado para comparar com datas de tarefas:
- `ManagerDashboard.tsx`
- `CoordinatorDashboard.tsx`
- `ManagerCoordinatorDashboard.tsx`

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/lib/date-utils.ts` | Exportar `toFakeUTC` |
| `src/pages/Dashboard/AdminDashboard.tsx` | Usar `toFakeUTC` no período |
| `src/pages/Dashboard/ManagerDashboard.tsx` | Idem |
| `src/pages/Dashboard/CoordinatorDashboard.tsx` | Idem |
| `src/pages/Dashboard/ManagerCoordinatorDashboard.tsx` | Idem |
| `src/lib/task-utils.ts` | Passar `created_at: nowAsFakeUTC()` no insert de time logs |

Nenhuma migração necessária.

