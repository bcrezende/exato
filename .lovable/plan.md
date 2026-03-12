

## Plano: Geração Imediata ao Concluir + Detecção de Tarefas Atrasadas

### Problema Atual
1. A geração de novas instâncias depende do cron (a cada hora) — demora até 1h após conclusão
2. Se uma tarefa nunca é concluída, a próxima instância nunca é gerada e ninguém sabe que ficou pra trás

### Solução

#### 1. Gerar próxima instância imediatamente ao concluir

Nos 3 pontos do front-end onde o funcionário marca "Concluir" (`MyDayView`, `TaskDetailModal`, `Tasks.tsx`), após o update de status para `completed`, chamar a Edge Function `generate-recurring-tasks` para gerar a próxima instância imediatamente.

Criar uma função utilitária compartilhada (ex: `src/lib/task-utils.ts`) que:
- Faz o update do status
- Se a tarefa tem `recurrence_parent_id` (é instância de recorrente), invoca `supabase.functions.invoke("generate-recurring-tasks")`

O cron continua existindo como fallback de segurança.

#### 2. Alterar Edge Function para permitir geração futura

Remover a restrição `if (newStart > now) continue` — quando chamada ao concluir, deve gerar a próxima instância mesmo que seja amanhã/semana que vem.

#### 3. Marcar tarefas não concluídas como "overdue"

Adicionar lógica na Edge Function: antes de processar a geração, verificar instâncias com `due_date < now()` e `status != completed` → marcar automaticamente como `overdue`.

Isso resolve o problema: mesmo que o funcionário não conclua, o sistema detecta e marca como atrasada.

#### 4. Gerar próxima instância mesmo sem concluir (se atrasada)

Quando a Edge Function detectar uma instância `overdue`, gerar a próxima instância normalmente (para que o dia seguinte tenha sua tarefa), mudando a condição de `status !== "completed"` para `status !== "completed" && status !== "overdue"` → não bloquear geração.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/lib/task-utils.ts` | Criar — função `completeTask()` que atualiza status e dispara geração |
| `supabase/functions/generate-recurring-tasks/index.ts` | Alterar — remover restrição de futuro, adicionar marcação de overdue, gerar após overdue |
| `src/components/dashboard/MyDayView.tsx` | Usar `completeTask()` da lib |
| `src/components/tasks/TaskDetailModal.tsx` | Usar `completeTask()` da lib |
| `src/pages/Tasks.tsx` | Usar `completeTask()` da lib |

### Fluxo Resultante

```text
Funcionário conclui tarefa
  → status = completed
  → Edge Function chamada
  → Próxima instância gerada imediatamente (pending)

Tarefa não concluída e due_date passou
  → Cron detecta (a cada hora)
  → Marca como overdue
  → Gera próxima instância normalmente
  → Gestor vê tarefa atrasada no dashboard
```

