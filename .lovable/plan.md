

## Cadastro de novas recorrências por administradores

### Situação atual

As recorrências são definidas como um **enum fixo no banco de dados** (`recurrence_type`): `none`, `daily`, `weekly`, `monthly`, `yearly`. Isso significa que estão "cravadas" na estrutura do banco e não podem ser adicionadas/removidas sem uma migração SQL. Toda a lógica de geração automática de tarefas recorrentes (Edge Function `generate-recurring-tasks`) usa um `switch/case` hardcoded com essas opções.

### Abordagem proposta

Substituir o enum fixo por uma **tabela de recorrências personalizadas** (`recurrence_definitions`) que admins podem gerenciar via interface, e adaptar toda a cadeia (banco → edge function → frontend).

### Alterações necessárias

**1. Banco de dados (migração SQL)**
- Criar tabela `recurrence_definitions` com colunas: `id`, `company_id`, `name` (label exibido), `key` (identificador único tipo slug), `interval_value` (número), `interval_unit` (enum: `day`, `week`, `month`, `year`), `max_span_days` (limite de intervalo para validação no form), `created_at`
- Popular com os 5 tipos padrão (none, daily, weekly, monthly, yearly) para cada empresa existente
- Alterar coluna `tasks.recurrence_type` de enum para `text` (referenciando a key da definição)
- RLS: admins podem CRUD, outros podem SELECT na própria empresa

**2. Edge Function `generate-recurring-tasks`**
- Em vez de `switch/case`, buscar a definição da recorrência na tabela `recurrence_definitions` pelo `recurrence_type` (key) da task
- Calcular `newStart` usando `interval_value` + `interval_unit` dinamicamente

**3. Frontend — Nova seção em Configurações (Settings)**
- Adicionar aba "Recorrências" na página de Settings (visível apenas para admin)
- Listar recorrências da empresa com opções de criar, editar e excluir
- Campos: Nome (ex: "Quinzenal"), Intervalo (número + unidade), Limite máximo de dias
- Impedir exclusão de recorrências em uso por tarefas ativas

**4. Frontend — TaskForm e TaskImportDialog**
- Trocar o `recurrenceLabels` hardcoded por dados carregados da tabela `recurrence_definitions`
- Adaptar validação de datas para usar `max_span_days` da definição selecionada
- Atualizar TaskDetailModal para exibir o nome correto

**5. Frontend — Tasks.tsx (filtros e exibição)**
- Atualizar `getEffectiveRecurrenceType` e labels para usar dados da tabela

### Considerações

- **Migração de dados**: os valores enum existentes (`daily`, `weekly`, etc.) serão preservados como keys na nova tabela, garantindo compatibilidade com tarefas já criadas
- **Complexidade**: é uma mudança estrutural significativa, afetando ~8 arquivos + migração + edge function
- **Alternativa mais simples**: se o objetivo for apenas adicionar tipos como "quinzenal" ou "bimestral", podemos simplesmente **adicionar novos valores ao enum existente** sem criar uma tabela de gestão. Isso é muito mais rápido mas não permite que admins criem tipos arbitrários pela interface

### Recomendação

Se a necessidade é adicionar alguns tipos específicos (ex: quinzenal, bimestral), a **alternativa simples** (expandir o enum) é mais prática. Se a ideia é dar liberdade total ao admin para criar qualquer recorrência, a abordagem com tabela é necessária.

