

## Recorrências avançadas: dias da semana, excluir fins de semana e feriados

### Problema
O sistema atual de recorrências é baseado apenas em intervalo fixo (a cada N dias/semanas/meses). Não suporta:
- Executar em **dias específicos da semana** (ex: Qua, Qui, Sex)
- **Excluir sábado/domingo** em recorrências diárias
- **Pular feriados**

### Solução

Adicionar 3 novos campos à tabela `recurrence_definitions` e uma tabela de feriados, com ajustes na Edge Function e no frontend.

### Alterações

**1. Migração SQL**
- Adicionar colunas à `recurrence_definitions`:
  - `weekdays integer[]` — dias permitidos (0=Dom, 1=Seg, ..., 6=Sáb). NULL = todos os dias
  - `skip_weekends boolean DEFAULT false` — pular sáb/dom ao calcular próxima data
  - `skip_holidays boolean DEFAULT false` — pular feriados cadastrados
- Criar tabela `company_holidays`:
  - `id`, `company_id`, `name`, `date (date)`, `recurring boolean` (repete todo ano)
  - RLS: admin pode CRUD, todos da empresa podem SELECT

**2. Edge Function `generate-recurring-tasks`**
- Após calcular `newStart`, aplicar lógica de ajuste:
  1. Se `weekdays` está definido: avançar até o próximo dia da semana permitido
  2. Se `skip_weekends`: avançar se cair em sáb/dom
  3. Se `skip_holidays`: verificar na tabela `company_holidays` e avançar se coincidir
- Para recorrência por dias da semana (ex: Qua/Qui/Sex): gerar múltiplas instâncias por semana — a cada execução do cron, verificar quais dias da semana atual ainda não têm instância e criá-las

**3. Frontend — RecurrenceSettings.tsx**
- Adicionar ao formulário de criação/edição:
  - Checkboxes para **dias da semana** (Seg-Dom) — visível quando unidade é "day" ou "week"
  - Toggle **"Pular fins de semana"** — visível quando unidade é "day"
  - Toggle **"Pular feriados"** — sempre visível
- Exibir dias selecionados na tabela de listagem

**4. Frontend — Nova seção "Feriados" em Configurações**
- Criar componente `HolidaySettings.tsx` com:
  - Tabela listando feriados da empresa (nome, data, se é recorrente)
  - Botão para adicionar/editar/excluir feriados
  - Campo de data + nome + checkbox "Repete todo ano"
- Adicionar como nova aba em Settings (visível para admin)

**5. Frontend — useRecurrenceDefinitions hook**
- Expor os novos campos (`weekdays`, `skip_weekends`, `skip_holidays`) no tipo `RecurrenceDefinition`
- Exibir informação dos dias ativos no TaskForm quando relevante

**6. Frontend — TaskForm.tsx**
- Ao selecionar uma recorrência que tem `weekdays` definidos, mostrar indicação visual dos dias ativos (ex: "Qua, Qui, Sex")

### Fluxo de exemplo

**Tarefa "Relatório diário" (Seg-Sex, sem feriados):**
1. Admin cria recorrência "Dias úteis" com intervalo 1 dia, `skip_weekends=true`, `skip_holidays=true`
2. Ao completar a tarefa de sexta, a Edge Function calcula próximo dia = sábado → pula para segunda
3. Se segunda for feriado, pula para terça

**Tarefa "Reunião Qua/Qui/Sex":**
1. Admin cria recorrência "3x por semana" com intervalo 1 semana, `weekdays=[3,4,5]`
2. A cada execução do cron, a função gera as instâncias para os dias da semana que ainda não existem

