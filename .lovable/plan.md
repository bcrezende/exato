

## Problema: Tarefas sobrepostas no calendário (Day/Week view)

Na imagem, "Conciliação bancária" e "PIX diário" começam no mesmo horário (07:00) e ficam uma sobre a outra porque ambas têm `position: absolute` com `top: "2px"` e `inset-x-0.5` — ocupam 100% da largura, sem nenhuma lógica de distribuição lateral.

O mesmo problema afeta a Week View.

### Solução

**`src/components/tasks/TaskCalendar.tsx`** — adicionar lógica de layout side-by-side para tarefas no mesmo horário:

1. **Calcular colunas por slot**: Quando múltiplas tarefas caem no mesmo horário, atribuir um índice de coluna (`columnIndex`) e total de colunas (`totalColumns`) a cada uma.

2. **Aplicar largura e posição lateral**:
   - `width`: `calc((100% - 4px) / totalColumns)`
   - `left`: `calc(columnIndex * (100% - 4px) / totalColumns + 2px)`
   - Remover `inset-x-0.5` (substituído pelo cálculo dinâmico)

3. **Aplicar em ambas as views**: `DayView` e `WeekView` usam a mesma lógica de posicionamento absoluto, então ambas precisam da correção.

4. **Detecção de sobreposição real** (não apenas mesmo horário): Verificar se tarefas que começam em horas diferentes se sobrepõem (ex: tarefa de 07:00-08:45 sobrepõe tarefa de 08:00). Agrupar tarefas que compartilham qualquer intervalo de tempo.

### Arquivo alterado
- **`src/components/tasks/TaskCalendar.tsx`** — adicionar função de cálculo de colunas e ajustar estilos inline nas views Day e Week

