

## Reorganizar layout do Dashboard: KPIs e resumo acima das Tabs

### O que muda
Mover `KpiCards` e o grid `TodayProgress + CriticalTasksList` para **acima** das tabs, sempre visíveis. As tabs ficam abaixo como navegação secundária.

### Layout final

```text
┌─────────────────────────────────────────┐
│ Dashboard              18/03/2026       │
│                         [Meu Dia 🔗]    │
├─────────────────────────────────────────┤
│ [12]     [5]      [4]      [3]          │  ← KPIs (sempre visíveis)
│ Hoje   Andamento Concluídas Atrasadas   │
├──────────────────┬──────────────────────┤
│ Donut Progresso  │ Próximas Tarefas     │  ← Sempre visível
│   67%            │ • Reunião 10h        │
│                  │ • Relatório 14h      │
│                  │ • Análise 16h        │
├──────────────────┴──────────────────────┤
│ [Hoje] [Atrasadas] [Equipe] [Analytics] │  ← Tabs
│  (conteúdo da tab selecionada)          │
└─────────────────────────────────────────┘
```

### Alterações

**`src/pages/Dashboard.tsx`** (único arquivo)
- Mover `KpiCards` para antes do `<Tabs>`, ficando sempre visível
- Mover o grid `TodayProgress + CriticalTasksList` para antes do `<Tabs>`
- Tab "Hoje" passa a conter conteúdo complementar (ou pode ser removida/renomeada) — como a informação principal já está acima, a tab "Hoje" pode mostrar a lista completa de tarefas do dia em formato expandido
- Tabs "Atrasadas", "Equipe" e "Analytics" permanecem como estão

Estrutura do JSX resultante:
```
<DashboardHeader />
<DashboardFilters />
<KpiCards ... />                          ← sempre visível
<div grid 2 cols>
  <TodayProgress ... />                   ← sempre visível (com donut)
  <CriticalTasksList ... />               ← sempre visível
</div>
<Tabs>
  <TabsTrigger "Hoje" / "Atrasadas" / "Equipe" / "Analytics" />
  <TabsContent "hoje"> lista expandida de tarefas </TabsContent>
  <TabsContent "atrasadas"> <OverdueSection /> </TabsContent>
  <TabsContent "equipe"> <PodiumCard /> </TabsContent>
  <TabsContent "analytics"> <LazyPerformanceAnalytics /> </TabsContent>
</Tabs>
```

**`src/components/dashboard/TodayProgress.tsx`**
- Adicionar um gráfico donut simples (pode ser feito com CSS/SVG ou com o componente de chart existente) mostrando a porcentagem de progresso do dia

