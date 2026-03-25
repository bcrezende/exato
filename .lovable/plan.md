

## Corrigir classificação prematura de tarefas como atrasadas/não feitas

### Problema identificado

Existem dois bugs relacionados ao tratamento de timezone que podem causar tarefas futuras aparecerem como "atrasadas" ou "não feitas":

### Bug 1 — Edge Function `mark-not-done-daily` ignora o timezone da empresa

A função busca `company.timezone` mas nunca o utiliza. Ela calcula `todayStart` usando `new Date()` do servidor (UTC). Como as datas são armazenadas como "fake UTC" (representando horário local brasileiro), quando a função roda à meia-noite UTC (21h no Brasil), tarefas com prazo entre 21:00 e 23:59 do dia atual no Brasil são incorretamente marcadas como `not_done` porque seu `due_date` fake UTC já é menor que o `todayStart` do dia seguinte em UTC real.

**Correção**: Usar o timezone da empresa para calcular o início do dia correto. Para `America/Sao_Paulo`, o "início de hoje" em fake UTC deve corresponder à data atual naquele fuso.

**Arquivo**: `supabase/functions/mark-not-done-daily/index.ts`
- Converter `now` para o timezone da empresa antes de extrair a data
- Calcular `todayStart` como `YYYY-MM-DDT00:00:00+00:00` usando a data local da empresa

### Bug 2 — Classificação client-side compara timestamp completo

Nos dashboards, a lógica `due_date < nowAsFakeUTC()` compara o timestamp completo (data + hora). Isso faz uma tarefa com prazo às 17:15 aparecer como "atrasada" a partir das 17:16, o que é correto para hora, mas vários locais usam essa lógica para classificar tarefas em colunas de "atrasadas" quando deveriam comparar apenas a **data** (dia inteiro).

**Correção**: Criar uma função `todayEndAsFakeUTC()` que retorna `YYYY-MM-DDT23:59:59+00:00` e usá-la nas comparações de overdue que classificam por dia, mantendo `nowAsFakeUTC()` apenas onde a comparação por hora faz sentido.

**Arquivos afetados**:
- `src/lib/date-utils.ts` — adicionar `todayEndAsFakeUTC()`
- `src/pages/Dashboard/CoordinatorDashboard.tsx` (linhas 190, 212, 226)
- `src/pages/Dashboard/ManagerDashboard.tsx` (linha 169)
- `src/pages/Dashboard/ManagerCoordinatorDashboard.tsx` (linha 159)
- `src/pages/Tasks.tsx` (linhas 263, 402-403) — classificação Kanban

### Detalhes técnicos

**Edge Function — cálculo correto do todayStart**:
```typescript
// Usar Intl.DateTimeFormat para obter a data no timezone da empresa
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: company.timezone || "America/Sao_Paulo",
  year: "numeric", month: "2-digit", day: "2-digit",
});
const todayStr = formatter.format(new Date()); // "2026-03-25"
const todayStart = `${todayStr}T00:00:00+00:00`;
```

**Nova função em date-utils.ts**:
```typescript
export function todayEndAsFakeUTC(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T23:59:59+00:00`;
}
```

**Substituição nos dashboards** — onde a classificação é por "dia atrasado":
```typescript
// Antes:
const isOverdue = ... t.due_date < nowFake;
// Depois:
const isOverdue = ... t.due_date.split("T")[0] < nowFake.split("T")[0];
```

Nenhuma migração de banco necessária.

