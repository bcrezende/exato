

## Aprimoramento da Análise de IA

### Visão Geral

Quatro melhorias na página `/analysis`: período personalizado com date picker, comparativo entre períodos, exportação em PDF, e seleção de tipo/foco da análise.

---

### 1. Período Personalizado (Date Range Picker)

**Arquivo:** `src/pages/Analysis.tsx`

- Adicionar opção "Personalizado" ao select de período
- Quando selecionado, exibir dois date pickers (De/Até) usando `Popover` + `Calendar` do Shadcn
- O `startDate` e `endDate` substituem o cálculo fixo do `startMap`

**Arquivo:** `src/components/dashboard/AIAnalysisDialog.tsx`
- Mesma lógica aplicada ao dialog de análise rápida nos dashboards

---

### 2. Comparativo entre Períodos

**Arquivo:** `src/pages/Analysis.tsx`

- Adicionar toggle/checkbox "Comparar com período anterior"
- Quando ativo, buscar dados do período anterior equivalente (ex: se selecionou última semana, buscar a semana antes dela)
- Enviar ambos os conjuntos de métricas para a Edge Function
- A IA gera análise comparativa com evolução percentual

**Arquivo:** `supabase/functions/generate-analysis/index.ts`
- Ajustar o prompt para receber métricas de dois períodos (`currentMetrics` e `previousMetrics`)
- Quando `previousMetrics` estiver presente, o prompt instrui a IA a comparar e destacar evoluções

---

### 3. Tipo/Foco da Análise

**Arquivo:** `src/pages/Analysis.tsx`

- Novo select com 4 opções de foco:
  - **Produtividade** (default) - foco em taxas de conclusão e eficiência
  - **Gargalos** - foco em atrasos, tarefas lentas e desvios de estimativa
  - **Equipe** - comparativo entre analistas, ranking de performance
  - **Riscos** - previsão de problemas baseada em tendências

**Arquivo:** `supabase/functions/generate-analysis/index.ts`
- Receber campo `analysisType` nos filtros
- Ajustar system prompt com instruções específicas para cada tipo de foco

---

### 4. Exportar Análise em PDF

**Arquivo:** `src/pages/Analysis.tsx`

- Botão "Exportar PDF" visível quando há resultado
- Usar biblioteca client-side (html2pdf.js ou react-pdf) para converter o conteúdo Markdown renderizado em PDF
- Incluir cabeçalho com filtros aplicados (período, setor, analista, tipo) e data de geração
- Instalar dependência: `html2pdf.js` (leve, converte DOM para PDF)

---

### Resumo de Arquivos

| Arquivo | Mudanças |
|---|---|
| `src/pages/Analysis.tsx` | Date range picker, toggle comparativo, select de tipo, botão PDF |
| `src/components/dashboard/AIAnalysisDialog.tsx` | Date range picker, select de tipo |
| `supabase/functions/generate-analysis/index.ts` | Prompts por tipo, suporte a métricas comparativas |
| `package.json` | Adicionar `html2pdf.js` |

