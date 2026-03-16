

## Assistente de Análise com IA

Criar um dialog/modal interativo tipo "wizard" no Dashboard onde o usuário configura filtros antes de gerar uma análise personalizada com IA.

### Fluxo do Wizard

1. **Step 1 — Período**: Hoje / Última semana / Último mês / Personalizado
2. **Step 2 — Setor**: Todos ou selecionar um específico (lista dos departamentos)
3. **Step 3 — Funcionário**: Todos ou selecionar um específico (filtrado pelo setor escolhido)
4. **Step 4 — Gerar análise**: Botão que envia os filtros, busca dados filtrados do banco e chama a edge function

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/AIAnalysisDialog.tsx` | **Novo** — Dialog com wizard de 3 steps + resultado |
| `supabase/functions/generate-analysis/index.ts` | **Novo** — Edge function que recebe dados filtrados e gera análise detalhada |
| `src/pages/Dashboard.tsx` | Adicionar botão "Análise IA" no header que abre o dialog |

### Componente `AIAnalysisDialog`

- Dialog com state machine simples: `filters` → `loading` → `result`
- Na tela de filtros: 3 selects (período, setor, funcionário) todos na mesma tela (sem steps separados, mais prático)
- Botão "Analisar" que:
  1. Busca do Supabase as tasks e time_logs filtrados por período, setor e funcionário
  2. Calcula métricas localmente (total tarefas, concluídas, atrasadas, tempo médio, etc.)
  3. Envia as métricas para a edge function `generate-analysis`
- Resultado exibido com markdown rendering
- Botão para refazer com outros filtros

### Edge Function `generate-analysis`

- Recebe métricas + contexto dos filtros (período, setor, funcionário)
- Prompt mais detalhado que o `generate-insights`, focado na análise específica solicitada
- Usa `google/gemini-3-flash-preview` via Lovable AI Gateway
- Retorna análise em português

### Dados enviados à IA

Todas as métricas são calculadas no frontend antes de enviar (a IA não acessa o banco):
- Total de tarefas no período
- Concluídas / Pendentes / Em andamento / Atrasadas
- Tempo médio de execução
- Taxa de atraso
- Distribuição por prioridade
- Top 3 tarefas com maior tempo de execução
- Nome do setor/funcionário selecionado (para contextualizar a resposta)

### UI no Dashboard

Adicionar botão com ícone `BrainCircuit` ao lado do botão "Meu Dia" no header do dashboard admin/manager.

