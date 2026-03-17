

## Regra de validação de datas por tipo de recorrência

### Problema
Tarefas com recorrência diária podem ser criadas com datas de início e término em dias diferentes, o que não faz sentido — uma tarefa diária deve começar e terminar no mesmo dia (apenas horários diferentes).

### Solução
Adicionar validação no `TaskForm.tsx` que restringe o intervalo de datas conforme o tipo de recorrência selecionado:

| Recorrência | Regra |
|---|---|
| Diária | Início e término devem ser no **mesmo dia** |
| Semanal | Término deve ser no máximo **7 dias** após o início |
| Mensal | Término deve ser no máximo **30 dias** após o início |
| Anual | Término deve ser no máximo **365 dias** após o início |
| Nenhuma | Sem restrição adicional (apenas término > início) |

### Alterações

**`src/components/tasks/TaskForm.tsx`:**
- Na função `validate()`, adicionar checagem: se `recurrence_type === "daily"`, comparar apenas a parte de data (ano-mês-dia) de `start_date` e `due_date` — se forem diferentes, exibir erro "Tarefas diárias devem iniciar e terminar no mesmo dia"
- Adicionar regras similares para semanal/mensal/anual com limites máximos de intervalo
- Adicionar um `useEffect` que, ao mudar `recurrence_type` para "daily", ajuste automaticamente o `due_date` para o mesmo dia do `start_date` (mantendo o horário de término), evitando que o usuário precise corrigir manualmente

Nenhuma alteração de banco necessária.

