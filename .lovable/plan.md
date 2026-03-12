

## Plano: Insights de IA no Dashboard de Performance

### O que será criado

Um card "Insights da IA" na seção de Análise de Performance que envia os indicadores calculados (tempo médio, taxa de atraso, gargalos, volume) para a IA e exibe comentários e recomendações gerados automaticamente.

### Implementação

**1. Edge Function `supabase/functions/generate-insights/index.ts`**
- Recebe os indicadores resumidos como JSON (não dados brutos — apenas métricas já calculadas)
- Envia para o Lovable AI Gateway (`google/gemini-3-flash-preview`) com system prompt em português focado em análise operacional
- Retorna resposta não-streaming (invoke simples)
- Trata erros 429/402

**2. `src/components/dashboard/PerformanceAnalytics.tsx`**
- Adicionar botão "Gerar Insights com IA" abaixo dos gráficos
- Ao clicar, envia o `summary` + `avgTimeByDept` + `delayRateByDept` + `completedPerDay` para a edge function
- Exibe o texto retornado em um card com ícone de sparkles
- Estado de loading enquanto processa

**3. `supabase/config.toml`**
- Adicionar entrada `[functions.generate-insights]` com `verify_jwt = false`

### Dados enviados à IA (exemplo)
```json
{
  "avgExecution": "2h 30min",
  "delayRate": 25,
  "completedLast7": 42,
  "worstDept": "Logística",
  "timeByDept": [{"department": "Logística", "avgMinutes": 150}],
  "delayByDept": [{"department": "Vendas", "rate": 40}],
  "completionTrend": [{"label": "10/03", "count": 5}, ...]
}
```

### System Prompt da IA
Análise operacional em português, máximo 4 parágrafos curtos, foco em: identificar gargalos, tendências, e sugerir ações concretas.

### Arquivos alterados
- **`supabase/functions/generate-insights/index.ts`** — nova edge function
- **`src/components/dashboard/PerformanceAnalytics.tsx`** — botão + card de insights

