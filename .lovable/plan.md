

## Animações Completas da Plataforma

### 1. Transições de página com slide suave

**`src/components/AppLayout.tsx`** — Substituir o `animate-fade-in` por uma transição slide+fade usando CSS:
- Trocar a classe `animate-fade-in` por uma nova `animate-page-enter` que combina slide lateral sutil (translateX) com fade
- Manter o `key={location.pathname}` para re-montar em cada rota

**`tailwind.config.ts`** + **`src/index.css`** — Adicionar keyframe `page-enter`:
```
page-enter: translateX(-12px) + opacity 0 → translateX(0) + opacity 1 (0.35s ease-out)
```

### 2. Animação no Kanban drag-and-drop

**`src/pages/Tasks.tsx`** — Melhorar feedback visual do drag:
- Card sendo arrastado: escala 1.05, sombra elevada, rotação sutil (já tem `rotate-[2deg]`, manter)
- Coluna de destino durante hover: borda pulsante com animação `ring-pulse`, fundo com gradiente suave
- Card solto: animação `scale-in` breve ao pousar na nova coluna
- Adicionar transição suave de `transform` e `box-shadow` nos cards

**`tailwind.config.ts`** — Adicionar keyframe `ring-pulse` para colunas de destino

### 3. Skeleton loading

**Novo: `src/components/skeletons/DashboardSkeleton.tsx`** — Shimmer que imita layout do dashboard (4 stat cards + seções de tarefas)

**Novo: `src/components/skeletons/TasksSkeleton.tsx`** — Shimmer que imita header + filter bar + 4 colunas kanban com cards placeholder

**Novo: `src/components/skeletons/TeamSkeleton.tsx`** — Shimmer que imita tabela de membros

**Páginas editadas:**
- `src/pages/Dashboard.tsx` — substituir spinner por `DashboardSkeleton`
- `src/components/dashboard/MyDayView.tsx` — substituir spinner por skeleton com 4 stat cards + lista
- `src/pages/Tasks.tsx` — adicionar loading state e usar `TasksSkeleton`
- `src/pages/Team.tsx` — substituir spinner/loading por `TeamSkeleton`

Usar o componente `Skeleton` existente em `src/components/ui/skeleton.tsx`.

### 4. Confetti/celebração ao concluir todas as tarefas do dia

**`src/components/dashboard/MyDayView.tsx`**:
- Detectar quando `stats.completed === tasks.length && tasks.length > 0`
- Disparar animação de confetti usando canvas puro (sem lib externa): criar partículas coloridas que caem por ~2.5s
- Novo componente inline `ConfettiCanvas` com `useEffect` + `requestAnimationFrame`
- Mostrar mensagem "Parabéns! Todas as tarefas concluídas! 🎉" com animação `scale-in`

### 5. Animação de colapso suave

**`src/index.css`** — Adicionar keyframe `collapse-in` / `collapse-out` para expandir/recolher suavemente:
```
collapse-in: height 0 + opacity 0 → auto + opacity 1
collapse-out: auto + opacity 1 → 0 + opacity 0
```

**`tailwind.config.ts`** — Registrar as animações `collapse-in` e `collapse-out`

Aplicar nas seguintes áreas:
- Filter bar do Tasks (ao expandir/colapsar filtros)
- Seções colapsáveis existentes que usem Collapsible/Accordion

### Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| `tailwind.config.ts` | Adicionar keyframes: `page-enter`, `ring-pulse`, `collapse-in/out` |
| `src/index.css` | Adicionar classes utilitárias |
| `src/components/AppLayout.tsx` | Trocar `animate-fade-in` por `animate-page-enter` |
| `src/pages/Tasks.tsx` | Melhorar classes do Kanban DnD, adicionar loading skeleton |
| `src/pages/Dashboard.tsx` | Substituir spinner por skeleton |
| `src/pages/Team.tsx` | Substituir loading por skeleton |
| `src/components/dashboard/MyDayView.tsx` | Skeleton + confetti ao completar tudo |
| `src/components/skeletons/DashboardSkeleton.tsx` | Novo |
| `src/components/skeletons/TasksSkeleton.tsx` | Novo |
| `src/components/skeletons/TeamSkeleton.tsx` | Novo |

Nenhuma dependência nova necessária — tudo feito com CSS/Tailwind + canvas nativo.

