

## Linha vermelha indicando hora atual no calendário

### O que será feito
Adicionar uma linha horizontal vermelha fina nas visualizações **Semana** e **Dia** do `TaskCalendar`, posicionada dinamicamente na hora/minuto atual. A linha se atualiza a cada minuto.

### Alterações

**`src/components/tasks/TaskCalendar.tsx`:**

1. **Hook de hora atual** — criar um estado `now` com `useState(new Date())` + `useEffect` com `setInterval` de 60s para atualizar, usado nas views Week e Day

2. **Componente `CurrentTimeLine`** — uma `div` absolutamente posicionada com:
   - `border-top: 2px solid red` 
   - Posição `top` calculada: `(hora + minutos/60) * 56px` (cada hora = 56px = h-14)
   - Um pequeno círculo vermelho na ponta esquerda
   - `z-index: 10` para ficar acima das tarefas

3. **WeekView** — renderizar a linha apenas na coluna do dia atual (`isSameDay(day, today)`), sobreposta ao grid de horas. A linha será adicionada como filho absoluto dentro do container do grid, abrangendo toda a largura da coluna

4. **DayView** — renderizar a linha apenas se `currentDate` é hoje, posicionada no container geral de horas

A visualização **Mês** não terá linha (não tem grid de horas).

