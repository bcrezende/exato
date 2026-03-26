

## Corrigir filtros de período na aba Visão Geral do Dashboard do Analista

### Causa raiz

A query de busca de tarefas (linha 171) usa um `.or()` que **sempre inclui todas as tarefas com status `overdue` e `not_done`**, sem filtro de data:

```
status.eq.overdue, status.eq.not_done, and(start_date...), and(due_date...)
```

Isso faz com que, ao trocar de período (Hoje → Semana → Mês), as mesmas tarefas atrasadas e não feitas sempre apareçam, dando a impressão de que o filtro não funciona. As KPIs, o donut e a tabela da Visão Geral refletem `allTasks` sem distinguir o período real.

Além disso, a opção "Personalizado" no toggle de período não tem um seletor de datas — clicar nela não faz nada.

### Solução

**1. `src/pages/Dashboard/AnalystDashboard.tsx`**

- **Separar a query em duas lógicas**: buscar as tarefas do período pela data, e filtrar overdue/not_done **também pelo período** (tarefas cujo `due_date` ou `start_date` cai dentro do range):
  ```
  .or(`and(start_date.gte.${start},start_date.lte.${end}),and(due_date.gte.${start},due_date.lte.${end})`)
  ```
  Remover o `status.eq.overdue,status.eq.not_done` sem filtro de data.

- **Adicionar inputs de data para o período "Personalizado"**: quando `period === "custom"`, exibir dois campos `<input type="date">` para data início e data fim, e calcular o `dateRange` a partir deles.

- **Adicionar estado para datas customizadas**: `customStart` e `customEnd` com `useState`.

- **Atualizar `getDateRange`**: aceitar as datas customizadas como parâmetro quando o período é "custom".

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/AnalystDashboard.tsx` | Remover overdue/not_done sem filtro de data da query; adicionar inputs de data customizada; atualizar getDateRange |

Nenhuma migração necessária — correção puramente frontend.

