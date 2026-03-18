

## Problema: Horários salvos no banco diferem da plataforma

### Causa raiz

O problema está em como as datas são convertidas ao salvar. No `TaskForm.tsx` (linha 141-142):

```typescript
start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
```

O input `datetime-local` retorna valores como `"2026-03-19T08:00"` (sem fuso). O JavaScript interpreta como hora **local** do navegador e `.toISOString()` converte para UTC. Para um usuário no Brasil (UTC-3), 08:00 vira 11:00 no banco. Isso por si só não é um bug -- na exibição, `new Date("2026-03-19T11:00:00+00")` converte de volta para 08:00 local via `format()` do date-fns.

**O problema real está em dois lugares:**

1. **Edge Function `generate-recurring-tasks`**: Roda em UTC no servidor. Quando usa `getHours()`, `getDay()`, `getDate()` etc., obtém valores UTC, não horário local do usuário. Isso causa:
   - Tarefas recorrentes geradas com horário UTC em vez do horário local
   - Verificação de fim de semana/feriado baseada no dia UTC (pode estar 1 dia errado para Brasil)
   - `weekStart` calculado em UTC

2. **Importação de tarefas** (`TaskImportDialog.tsx`): `parseBrDate` cria datas locais, mas `resolveDate` converte com `.toISOString()` -- isso está correto. Porém, se o Excel contém objetos `Date`, a conversão pode perder o fuso.

### Plano de correção

**1. Adicionar coluna `timezone` na tabela `companies`**
- Migração SQL: `ALTER TABLE companies ADD COLUMN timezone text NOT NULL DEFAULT 'America/Sao_Paulo'`
- Permite que cada empresa tenha seu fuso horário configurado

**2. Corrigir Edge Function `generate-recurring-tasks`**
- Buscar o `timezone` da empresa
- Usar funções auxiliares para converter UTC → local antes de operações de dia/hora (getDay, getHours, isWeekend, isHoliday)
- Garantir que as datas geradas respeitem o fuso local do usuário

**3. Corrigir `TaskForm.tsx` — salvar com offset explícito**
- Em vez de `new Date(form.start_date).toISOString()`, construir a string ISO com o offset do fuso local do navegador
- Ou manter a abordagem atual (que funciona corretamente) e focar apenas no servidor

**4. Adicionar configuração de fuso na página de Settings**
- Campo select com fusos horários brasileiros comuns
- Visível apenas para admin

### Arquivos afetados
- `supabase/functions/generate-recurring-tasks/index.ts` — corrigir lógica de timezone
- `src/pages/Settings.tsx` — campo de timezone (opcional)
- Migração SQL — coluna `timezone` em `companies`

### Observação
A exibição no frontend está correta (date-fns converte UTC→local automaticamente). O problema principal é o **servidor (edge function)** operando em UTC puro, o que afeta geração de tarefas recorrentes e verificações de dia da semana/feriado.

