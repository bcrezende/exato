
## Corrigir “Atrasadas Hoje” para considerar atraso por início ou por prazo

### Diagnóstico

A tarefa `a673e809-4687-4149-8ec7-a952d0d51d51` tem:

- `start_date = 2026-03-26T07:30:00+00:00`
- `due_date = 2026-03-26T09:00:00+00:00`
- `status = pending`

Hoje o `AdminDashboard` considera “Atrasadas Hoje” apenas por **prazo vencido**:

- `overdueTasks` usa só `t.due_date < cutoff`
- `drillDown` do filtro `"overdue"` usa só `t.due_date < cutoff`

Por isso essa tarefa fica fora: o prazo ainda não venceu, mas o **início já venceu**, então ela deveria entrar como atrasada.

### O que ajustar

**Arquivo principal:** `src/pages/Dashboard/AdminDashboard.tsx`

#### 1. Criar regra única de atraso “operacional”
Considerar uma tarefa atrasada quando:

- não está `completed`
- e já passou do horário de **início** sem começar (`status = pending` e `start_date < cutoff`)
- ou já passou do **prazo final** sem concluir (`status !== completed` e `due_date < cutoff`)

Em termos práticos:

```ts
const isStartOverdue =
  t.status === "pending" &&
  t.start_date &&
  t.start_date < cutoff;

const isDueOverdue =
  t.status !== "completed" &&
  t.due_date &&
  t.due_date < cutoff;

return isStartOverdue || isDueOverdue;
```

#### 2. Aplicar essa mesma regra no card e no drill-down
Hoje o card e a tabela detalhada não usam exatamente a mesma definição. Vou alinhar os dois pontos:

- `const overdueTasks = useMemo(...)`
- `case "overdue"` dentro de `drillDownTasks`

Assim o número do card e a lista aberta ao clicar passam a bater.

#### 3. Restringir ao período atual corretamente
Manter a lógica já existente de período:

- usar `cutoff = min(nowAsFakeUTC(), periodEndISO)`
- manter a tarefa dentro do período se o `start_date` **ou** `due_date` estiver dentro do range selecionado

Isso evita:
- marcar como atrasada tarefa futura
- perder tarefa do dia cujo atraso veio do `start_date`

### Resultado esperado

Para o caso que você apontou:

- tarefa com início às **07:30**
- agora por volta de **08:43**
- status **pending**

Ela passará a aparecer em **Atrasadas Hoje**, mesmo com `due_date` às 09:00.

Ao mesmo tempo:

- tarefas com início às 09:00 e prazo às 09:30 às 08:43 **não** aparecerão atrasadas
- tarefas cujo prazo final já passou continuam aparecendo normalmente

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/AdminDashboard.tsx` | Trocar a lógica de “overdue” para considerar `start_date` vencido e `due_date` vencido |

### Observação importante

Encontrei uma inconsistência de conceito no projeto:

- alguns dashboards tratam “atrasada” por **dia inteiro**
- o `AdminDashboard` está tratando por **horário exato**

Para corrigir seu caso sem quebrar o que já foi acertado antes, vou manter no `AdminDashboard` a lógica por **horário exato**, mas com dupla regra:
- atraso de início
- atraso de conclusão

Isso resolve o problema real que você mostrou e deixa o card mais coerente com a operação.

<lov-actions>
<lov-suggestion message="Teste o card 'Atrasadas Hoje' no dashboard admin e confirme se tarefas com start_date já vencido aparecem corretamente">Verifique que funciona</lov-suggestion>
<lov-suggestion message="Depois dessa correção, alinhe também os dashboards de gerente e coordenador para usar a mesma regra de atraso por início e por prazo">Alinhar outros dashboards</lov-suggestion>
</lov-actions>
