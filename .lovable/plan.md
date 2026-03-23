
## Bug no Calendário Dia/Semana: tarefas “somem” por trás de outras

### Diagnóstico

Sim, muito provavelmente essas tarefas estão ficando “atrás” de outras no calendário.

Pelo código atual de `src/components/tasks/TaskCalendar.tsx`, há dois problemas de layout nas visões **Dia** e **Semana**:

1. **A posição vertical ignora os minutos**
   - Hoje toda tarefa renderiza com `top: "2px"` dentro da linha da hora.
   - Exemplo: uma tarefa às **09:45** deveria aparecer mais abaixo dentro da faixa das 09h, mas ela é desenhada no topo da linha das 09h.
   - Resultado: tarefas como **09:00** e **09:45** acabam sendo desenhadas uma em cima da outra.

2. **Durações curtas são infladas artificialmente**
   - `getTaskTimeRange()` força duração mínima de **30 min**.
   - `getTaskDurationHours()` força altura mínima de **1 hora**.
   - Isso faz tarefas curtas parecerem maiores do que realmente são e cria “sobreposição falsa”, reduzindo largura e escondendo cards.

### Como isso explica seu print

- **CONFERIR ABERTURA DE KM (09:00–09:30)** some porque a tarefa de **09:45–10:30** está sendo desenhada no mesmo topo da linha das 09h.
- **REPOSIÇÃO DE ESTOQUE (16:15–16:30)** some porque as tarefas de 16:30 e 16:45 acabam ocupando a mesma região visual, e as regras atuais ainda ampliam os blocos curtos, causando sobreposição indevida.

### Plano de correção

**Arquivo:** `src/components/tasks/TaskCalendar.tsx`

#### 1. Corrigir posicionamento por minuto
Em vez de renderizar sempre no topo da célula da hora, calcular:
- `top` com base nos minutos dentro da hora
- Ex.: `09:45` deve iniciar ~75% abaixo da linha das 09h

#### 2. Corrigir altura real da tarefa
Usar a duração real em minutos para a altura visual:
- 15 min = bloco curto
- 30 min = bloco médio
- 45 min = bloco maior
- 1h+ = proporcional

Manter apenas uma altura mínima visual pequena para não sumir completamente, sem inflar para 1h.

#### 3. Ajustar cálculo de overlap
Parar de expandir artificialmente o intervalo no algoritmo de layout:
- usar `startHour` e `endHour` reais
- só considerar overlap quando houver interseção real entre horários

#### 4. Aplicar a mesma lógica em Dia e Semana
As duas views usam a mesma base de layout, então a correção deve valer para ambas para evitar divergência.

### Resultado esperado

Para o dia **24/03/2026** com esse responsável:
- as **9 tarefas** devem aparecer visualmente no calendário
- tarefas de 15, 30 e 45 minutos deixam de se esconder
- cards passam a respeitar melhor o horário real dentro da grade

### Detalhe técnico

Hoje o problema está principalmente nestes trechos:
- `getTaskTimeRange()`
- `getTaskDurationHours()`
- render dos cards em `WeekView`
- render dos cards em `DayView`

A correção será nesta linha de raciocínio:

```typescript
const startMinutes = start.getHours() * 60 + start.getMinutes();
const endMinutes = end.getHours() * 60 + end.getMinutes();

const top = ((startMinutes % 60) / 60) * 56;
const height = Math.max(((endMinutes - startMinutes) / 60) * 56 - 4, MIN_CARD_HEIGHT);
```

e o filtro por hora deixa de depender apenas de `Math.floor(startHour) === hour`, passando a renderizar cada tarefa na posição absoluta correta dentro da grade.

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `src/components/tasks/TaskCalendar.tsx` | Corrigir posicionamento vertical, altura proporcional e cálculo de overlap real |

