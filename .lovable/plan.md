

## Plano: Aprimoramento Geral do Sistema de Tarefas

Reorganização completa para tornar a plataforma mais profissional e funcional, inspirada em Trello/Notion.

---

### 1. Campos Obrigatórios no Formulário de Tarefas

**Arquivo:** `src/components/tasks/TaskForm.tsx`

- Tornar obrigatórios: **Título**, **Responsável**, **Data/Hora Início**, **Data/Hora Término**, **Setor** (admin) e **Recorrência**
- Validação com mensagens de erro inline (destaque vermelho nos campos vazios)
- Remover campo **Prioridade** do formulário e do payload (manter coluna no banco com default, mas não exibir na UI)
- Remover campo **Status** da criação (sempre inicia como "pending"); manter apenas na edição

**Arquivo:** `src/components/tasks/TaskDetailModal.tsx`
- Remover exibição de prioridade

**Arquivo:** `src/pages/Tasks.tsx`
- Remover badges de prioridade da listagem

**Arquivo:** `src/components/dashboard/MyDayView.tsx`
- Remover badges de prioridade

**Arquivo:** `src/pages/Dashboard.tsx`
- Remover referências visuais a prioridade nos cards e seções

---

### 2. Página /tasks — Novo Layout Kanban + Filtros

**Arquivo:** `src/pages/Tasks.tsx` — Reescrever com 3 modos de visualização:

**Visualizações:**
- **Kanban** (padrão) — 4 colunas: Pendente | Em Andamento | Concluída | Atrasada
  - Cards com: título, responsável, setor, datas, badge de status
  - Visual limpo estilo Trello (cards brancos, colunas com fundo sutil)
- **Lista** — Tabela organizada com colunas (já existe, aprimorar espaçamento)
- **Calendário** — Mantido como está

**Barra de Filtros** (visível em todos os modos):
- Busca por texto (título/descrição)
- Filtro por status (multi-select ou chips)
- Filtro por setor (dropdown)
- Filtro por responsável (dropdown)
- Filtro por recorrência (dropdown)
- Botão "Limpar filtros"

**Layout Kanban:**
```text
┌──────────┬──────────┬──────────┬──────────┐
│ Pendente │Em Andam. │Concluída │ Atrasada │
│ (count)  │ (count)  │ (count)  │ (count)  │
├──────────┼──────────┼──────────┼──────────┤
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │
│ │Card  │ │ │Card  │ │ │Card  │ │ │Card  │ │
│ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │
│ ┌──────┐ │          │          │          │
│ │Card  │ │          │          │          │
│ └──────┘ │          │          │          │
└──────────┴──────────┴──────────┴──────────┘
```

---

### 3. Dashboard — Remover prioridade, manter estrutura

- Remover badges e referências a prioridade de `AdminManagerDashboard`, `TaskMiniCard` e `MyDayView`
- Na seção "Próximos Dias", trocar texto "X alta prioridade" por "X tarefas"
- Manter toda a estrutura temporal (atrasadas, hoje, próximos dias)

---

### 4. Resumo de Arquivos Alterados

| Arquivo | Alteração |
|---|---|
| `src/components/tasks/TaskForm.tsx` | Campos obrigatórios com validação, remover prioridade, status fixo na criação |
| `src/pages/Tasks.tsx` | Layout Kanban como padrão, barra de filtros completa, remover prioridade |
| `src/components/tasks/TaskDetailModal.tsx` | Remover prioridade |
| `src/components/dashboard/MyDayView.tsx` | Remover prioridade |
| `src/pages/Dashboard.tsx` | Remover prioridade dos cards e seções |

Nenhuma alteração no banco de dados. A coluna `priority` permanece com default "medium" para compatibilidade, apenas deixa de ser exibida/editada.

