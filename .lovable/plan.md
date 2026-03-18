

## Bug: Instâncias recorrentes copiam dados do pai em vez da última instância

### Problema identificado

A Edge Function `generate-recurring-tasks` tem dois fluxos de geração:

1. **Weekday-based** (linhas 272-280): copia `title`, `description`, `priority`, `assigned_to`, `department_id` sempre do **parent** (tarefa original).
2. **Standard interval-based** (linhas 382-394): mesmo problema — copia tudo do **parent**.

A query da linha 302-304 busca a última instância, mas só seleciona `start_date, due_date, status` — usa apenas para calcular datas. Os campos de conteúdo (título, descrição, prioridade, responsável, setor) sempre vêm do parent.

**Cenário do bug:** Tarefa pai criada dia 16 → instância dia 17 é editada (título alterado) → instância dia 18 é gerada com dados do pai (dia 16), ignorando a edição do dia 17.

### Solução

Alterar a Edge Function para buscar os campos de conteúdo da **última instância** (se existir) em vez do parent.

### Alterações em `supabase/functions/generate-recurring-tasks/index.ts`

**1. Fluxo standard (linha 302-304):** Expandir o `select` da última instância para incluir todos os campos relevantes:
```
.select("start_date, due_date, status, title, description, priority, assigned_to, department_id")
```

Ao criar a nova instância (linhas 382-394), usar os dados da última instância quando disponível:
```typescript
const source = latestInstance || parent;
// ...
title: source.title || parent.title,
description: source.description ?? parent.description,
priority: source.priority || parent.priority,
assigned_to: source.assigned_to || parent.assigned_to,
department_id: source.department_id || parent.department_id,
```

**2. Fluxo weekday-based (linhas 240-295):** Mesma lógica — buscar a instância mais recente antes de criar novas instâncias da semana, e usar seus campos de conteúdo como fonte.

**3. Campos que sempre vêm do parent** (não mudam):
- `company_id` — sempre do parent
- `created_by` — sempre do parent
- `recurrence_parent_id` — sempre do parent

### Arquivo afetado
- `supabase/functions/generate-recurring-tasks/index.ts`

