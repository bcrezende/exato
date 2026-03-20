

## Correção: Recorrências Personalizadas Não Geram Próxima Instância

### Problema Identificado

O fluxo de weekdays na Edge Function **só procura na semana atual**. Quando o usuário completa uma tarefa (ex: "Terça e Sexta" numa sexta às 15h), a função:

1. Calcula `weekStart` = domingo da semana atual (15/mar)
2. Itera os weekdays `[2, 5]` (terça e sexta) desta semana
3. Terça 17/mar → já passou → `skip`
4. Sexta 20/mar 08:00 → `08:00 < 15:25 (agora)` → `skip`
5. **Resultado: 0 instâncias criadas**

A função nunca olha para a **próxima semana**, então após completar a tarefa, nada é gerado.

### Correção

**Arquivo:** `supabase/functions/generate-recurring-tasks/index.ts`

Alterar o loop de weekdays para iterar sobre **2 semanas** (semana atual + próxima semana), e parar após criar **1 instância** (quando chamado com `singleParentId`). Quando chamado pelo cron (sem `singleParentId`), continua gerando para toda a semana atual + próxima.

```text
Antes:
  for (const wd of def.weekdays) {
    candidate = weekStart + wd dias
    if (candidate < now) continue;  // ← pula tudo que já passou
    ...
  }

Depois:
  for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
    for (const wd of def.weekdays) {
      candidate = weekStart + (weekOffset * 7) + wd dias
      if (candidate < now) continue;
      // ... gera instância
      if (singleParentId) break; // para no primeiro
    }
    if (singleParentId && creou) break;
  }
```

### Impacto

- Recorrências personalizadas com weekdays (segunda_e_quarta, terca_e_sexta, 3x_na_semana, etc.) passam a gerar a próxima instância corretamente
- Recorrências do sistema (daily, weekly, monthly) não são afetadas (usam o fluxo de intervalo)
- A lógica de deduplicação existente previne instâncias duplicadas

