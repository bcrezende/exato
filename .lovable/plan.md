

## Correção: Recorrências Personalizadas Não Respeitadas

### Problema Identificado

A Edge Function `generate-recurring-tasks` tem um bug na condição que decide qual fluxo de geração usar. A lógica de **weekdays** (dias da semana específicos) só é ativada quando `interval_unit === "week"` (linha 228):

```text
if (def && def.weekdays && def.weekdays.length > 0 && def.interval_unit === "week")
```

Porém, **todas as recorrências personalizadas** do banco estão com `interval_unit = "day"`:

| Recorrência | weekdays | interval_unit | Resultado |
|---|---|---|---|
| Segunda e Quarta | [1, 3] | **day** | ❌ Cai no fluxo errado |
| Terça e Sexta | [2, 5] | **day** | ❌ Cai no fluxo errado |
| Diária sem Sáb/Dom | [1,2,3,4,5,6] | **day** | ❌ Cai no fluxo errado |
| Diária com Sábado | [1,2,3,4,5,6] | **day** | ❌ Cai no fluxo errado |
| 3x Na semana | [3, 4, 5] | **day** | ❌ Cai no fluxo errado |

Como caem no **fluxo padrão** (interval-based), o sistema:
1. Avança N dias em vez de respeitar os weekdays específicos
2. Usa `adjustToValidDay` que apenas pula para frente, não garante que caia num dos dias definidos
3. Gera no máximo 1 task por ciclo, quando deveria gerar uma para cada weekday da semana

Isso explica por que "Monitoramento de Lançamentos" (diaria_sem_sabado_e_domingo) funciona parcialmente — ele avança 1 dia e depois `adjustToValidDay` pula fins de semana — mas recorrências como "segunda_e_quarta" falham porque avançar 2 dias de segunda dá quarta, mas de quarta dá sexta (errado).

### Plano de Correção

#### 1. Corrigir a condição de entrada do fluxo weekday

Alterar a linha 228 de:
```
if (def && def.weekdays && def.weekdays.length > 0 && def.interval_unit === "week")
```
Para:
```
if (def && def.weekdays && def.weekdays.length > 0)
```

Isso garante que qualquer definição com weekdays use o fluxo correto, independente de `interval_unit`.

#### 2. Arquivo a editar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/generate-recurring-tasks/index.ts` | Remover `&& def.interval_unit === "week"` da condição (linha 228) |

### Impacto

- Todas as 6 recorrências personalizadas passam a funcionar corretamente
- Recorrências do sistema (daily, weekly, monthly, yearly) não são afetadas (não têm weekdays definidos, então a condição continua false para elas)
- Nenhuma mudança no frontend necessária

