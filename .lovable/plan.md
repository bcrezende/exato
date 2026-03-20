

## Desativar pg_cron

### Estado atual
Existe **1 cron job** ativo:

| Job ID | Nome | Frequência | Função |
|--------|------|------------|--------|
| 5 | `generate-recurring-tasks` | A cada 6 horas | Marca tarefas como overdue + gera instâncias recorrentes |

### Ação
Executar SQL para remover o job:

```sql
SELECT cron.unschedule('generate-recurring-tasks');
```

### Impacto
- **Tarefas recorrentes**: Ainda serão geradas **on-demand** quando um usuário concluir uma tarefa (via `task-utils.ts` → Edge Function com `parentId`). Apenas a geração automática a cada 6h para.
- **Marcação de overdue**: Tarefas pendentes **não serão mais marcadas como overdue automaticamente**. Só serão marcadas se alguém completar uma tarefa recorrente e a Edge Function rodar sem `parentId`.

### Arquivo
Nenhum arquivo do projeto precisa ser editado — apenas o SQL acima no banco.

