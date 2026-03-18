

## Adicionar Tabs principais ao Dashboard

### Conceito
Substituir o layout linear atual por 4 tabs de nível superior que organizam todo o conteúdo do dashboard:

| Tab | Conteúdo |
|-----|----------|
| **Hoje** | KpiCards + TodayProgress + CriticalTasksList |
| **Atrasadas** | OverdueSection (expandida, sem ser compacta) |
| **Equipe** | PodiumCard (ranking de produtividade) |
| **Analytics** | PerformanceAnalytics (lazy loaded) |

### Alterações

**`src/pages/Dashboard.tsx`**
- Adicionar estado `activeTab` com valor padrão `"hoje"`
- Envolver as seções existentes em `<Tabs>` com 4 `<TabsTrigger>`: Hoje, Atrasadas, Equipe, Analytics
- Cada `<TabsContent>` renderiza os componentes correspondentes
- Manter KpiCards **fora** das tabs (sempre visível no topo) ou dentro da tab "Hoje" — depende da preferência

**`src/components/dashboard/PerformanceTabs.tsx`**
- Remover este componente wrapper (as tabs dele são promovidas para o nível superior)
- Importar `PodiumCard` e `PerformanceAnalytics` diretamente no `Dashboard.tsx`

**`src/components/dashboard/OverdueSection.tsx`**
- Expandir para versão completa quando exibida como tab própria (sem limite de itens)

### Estrutura final do Dashboard

```text
┌─────────────────────────────────────────────┐
│ Dashboard          18/03/2026  [Filtros] [◎] │
├─────────────────────────────────────────────┤
│ [Hoje] [Atrasadas] [Equipe] [Analytics]      │
├─────────────────────────────────────────────┤
│                                              │
│  (conteúdo da tab ativa)                     │
│                                              │
└─────────────────────────────────────────────┘
```

### Arquivos afetados
- `src/pages/Dashboard.tsx` — adicionar Tabs de nível superior, reorganizar seções
- `src/components/dashboard/PerformanceTabs.tsx` — remover (promover conteúdo)
- `src/components/dashboard/OverdueSection.tsx` — ajustar para modo expandido

