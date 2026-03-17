

## Remover card "Insights da IA" do Dashboard

Remover o bloco do card de Insights da IA no `PerformanceAnalytics.tsx` (linhas 351-419) e os estados/imports relacionados (`aiInsights`, `loadingInsights`, `Sparkles`, `Loader2`, chamada ao `generate-insights`).

### Alterações

**`src/components/dashboard/PerformanceAnalytics.tsx`:**
- Remover linhas 351-419 (card inteiro do AI Insights)
- Remover estados `aiInsights` e `loadingInsights`
- Remover imports não mais utilizados (`Sparkles`, `Loader2` se não usados em outro lugar)
- O `</div>` de fechamento na linha 420 permanece

Nenhuma alteração de banco ou em outros arquivos.

