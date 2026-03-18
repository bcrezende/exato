

## Salvar datas exatamente como o usuário digita (sem conversão UTC)

### Problema atual
Quando o usuário digita `2026-03-19T08:00` no input `datetime-local`, o código faz `new Date("2026-03-19T08:00").toISOString()` que converte para UTC: `2026-03-19T11:00:00.000Z`. No banco aparece `11:00` em vez de `08:00`.

### Solução
Tratar o valor do input como "hora absoluta" — anexar `+00:00` (UTC) diretamente à string, forçando o banco a armazenar exatamente o que o usuário digitou.

### Alterações

**1. `src/components/tasks/TaskForm.tsx`** (linhas 141-142)
- Substituir `new Date(form.start_date).toISOString()` por uma função que monta a string ISO sem conversão de fuso:
```typescript
// De:
start_date: new Date(form.start_date).toISOString()
// Para:
start_date: form.start_date ? `${form.start_date}:00+00:00` : null
```
- Isso faz com que `08:00` no input seja salvo como `08:00:00+00:00` no banco.

**2. `src/components/tasks/TaskForm.tsx`** — função `toLocalDatetimeString`
- Atualizar para ler diretamente os valores UTC (já que agora o banco armazena o horário "como digitado" em UTC):
```typescript
// Usar getUTCHours/getUTCMinutes em vez de getHours/getMinutes
```

**3. `src/components/tasks/TaskImportDialog.tsx`** (linhas 90-101)
- Aplicar a mesma lógica na função `resolveDate` — montar a string ISO sem conversão de fuso local.

**4. `src/pages/Tasks.tsx` e outros componentes de exibição**
- Onde exibem datas com `format(new Date(task.start_date), ...)`, usar `formatInTimeZone` do date-fns ou extrair componentes UTC para garantir que `08:00` no banco apareça como `08:00` na tela.

**5. Edge Function `generate-recurring-tasks`**
- Já usa `toLocalDate` com timezone da empresa. Com essa mudança, os valores no banco já representam hora local, então simplificar a lógica removendo conversões desnecessárias — as datas no banco agora **são** a hora local.

### Impacto em dados existentes
As tarefas já salvas continuarão mostrando com +3h de diferença (ex: `08:00` digitado está como `11:00` no banco). Podemos rodar uma migração SQL para corrigir:
```sql
UPDATE tasks SET
  start_date = start_date - interval '3 hours',
  due_date = due_date - interval '3 hours'
WHERE company_id IN (
  SELECT id FROM companies WHERE timezone = 'America/Sao_Paulo'
);
```

### Arquivos afetados
- `src/components/tasks/TaskForm.tsx` — salvar sem conversão UTC
- `src/components/tasks/TaskImportDialog.tsx` — mesma correção
- `src/pages/Tasks.tsx` — exibição com UTC direto
- `supabase/functions/generate-recurring-tasks/index.ts` — simplificar lógica de timezone
- Migração SQL — corrigir dados existentes

