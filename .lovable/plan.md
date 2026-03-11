

## Plano: Sistema de Tarefas Profissional com Calendário Interativo

### 1. Migração de Banco de Dados

Adicionar coluna `start_date` (timestamp with time zone, nullable) na tabela `tasks`. A coluna `due_date` existente será usada como data/hora de término.

```sql
ALTER TABLE public.tasks ADD COLUMN start_date timestamp with time zone;
```

### 2. Refatorar Página de Tarefas (`src/pages/Tasks.tsx`)

**Formulário de criação/edição:**
- Substituir campo "Prazo" por dois campos: "Data/Hora de Início" e "Data/Hora de Término"
- Gerente: dropdown de responsável filtra apenas membros do seu setor
- Manter campos: Título, Descrição, Status, Prioridade, Recorrência, Setor (admin)

**Visualização principal — Calendário interativo custom:**
- Construir calendário com 3 visões: **Mês**, **Semana** e **Dia**
- Botões de alternância no topo do calendário
- **Visão Mês**: grade 7x5/6 com tarefas como chips coloridos por status
- **Visão Semana**: grade com eixo Y = horas (0h-23h), eixo X = 7 dias; tarefas como blocos posicionados entre start_date e due_date
- **Visão Dia**: coluna única com eixo Y = horas; blocos de tarefa ocupando duração exata
- **Cores por status**: Cinza=Pendente, Azul=Em Andamento, Verde=Concluída, Vermelho=Atrasada
- Navegação: botões ← → e "Hoje" para navegar entre períodos

**Modal de detalhes ao clicar na tarefa:**
- Exibe: Título, Descrição, Status, Prioridade, Responsável (nome), Início, Término, Setor
- Funcionário: botão para atualizar status
- Gerente/Admin: botões para editar e excluir

**Manter lista de tarefas** como visão alternativa (ícone de lista)

### 3. Atualizar Dashboard (`src/pages/Dashboard.tsx`)

- Atualizar referências ao campo `start_date` nos cards e calendário existente
- Exibir intervalo início-término onde aplicável

### 4. Estrutura de Componentes

Criar componentes auxiliares para organização:
- `src/components/tasks/TaskCalendar.tsx` — calendário principal com visões mês/semana/dia
- `src/components/tasks/TaskDetailModal.tsx` — modal de detalhes da tarefa
- `src/components/tasks/TaskForm.tsx` — formulário de criação/edição

### 5. Design

- Interface limpa, corporativa, sem bibliotecas externas de calendário
- Aproveitamento total da largura da tela no calendário
- Cores sólidas suaves nos blocos de tarefa
- Tipografia clara, espaçamento consistente

### Arquivos alterados
- **Migração SQL**: adicionar `start_date` à tabela `tasks`
- `src/pages/Tasks.tsx` — refatorar completamente
- `src/pages/Dashboard.tsx` — ajustes para `start_date`
- `src/components/tasks/TaskCalendar.tsx` — novo
- `src/components/tasks/TaskDetailModal.tsx` — novo
- `src/components/tasks/TaskForm.tsx` — novo

