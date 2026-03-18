

## Padronizar Modais do Projeto

### Abordagem

Em vez de criar um componente `Modal` wrapper separado (que adicionaria uma camada de abstração desnecessária sobre o Dialog do Radix que já fornece ESC, body scroll lock, backdrop), vou **padronizar o `dialog.tsx` base** e ajustar cada modal consumidor para usar classes e padrões consistentes.

### 1. Atualizar `src/components/ui/dialog.tsx`

- **Overlay**: Trocar `bg-black/80` por `bg-black/50 backdrop-blur-sm` (mais suave)
- **DialogContent**: Remover animações de slide (slide-out-to-left, slide-in-from-top), manter apenas `fade + zoom-out-95/zoom-in-95` com `duration-200` entrada e `duration-150` saída
- **Close button (X)**: Adicionar `hover:bg-accent rounded-full p-1` para hover mais suave
- **DialogHeader**: Centralizar título por padrão — `text-center`
- **DialogFooter**: Garantir `gap-3` e `sm:justify-end`

### 2. Padronizar cada modal — tamanhos e estrutura

Aplicar classes `className` consistentes no `DialogContent` de cada arquivo:

| Modal | Arquivo | Tamanho |
|-------|---------|---------|
| Novo/Editar Tarefa | `TaskForm.tsx` | `max-w-lg` (já está) |
| Detalhes Tarefa | `TaskDetailModal.tsx` | `max-w-md` (já está) |
| Importação | `TaskImportDialog.tsx` | `max-w-2xl` |
| Novo Setor | `Team.tsx` (inline) | `max-w-md` |
| Convidar Membro | `Team.tsx` (inline) | `max-w-md` |
| Editar Membro | `EditMemberDialog.tsx` | `max-w-md` |
| Editar Setor | `EditDepartmentDialog.tsx` | `max-w-md` |
| Vínculos Coordenador | `CoordinatorLinksTab.tsx` | `max-w-md` |
| Recorrências | `RecurrenceSettings.tsx` | `max-w-lg` (já está) |
| Feriados | `HolidaySettings.tsx` | `max-w-md` |
| Análise IA | `AIAnalysisDialog.tsx` | `max-w-2xl` |
| Histórico Análise | `AnalysisHistoryDialog.tsx` | `max-w-2xl` (já está) |
| KPI lista | `KpiCards.tsx` | `max-w-lg` |
| Delay detalhes | `DelayKpiCards.tsx` | `max-w-2xl` |
| Performance | `PerformanceAnalytics.tsx` | `max-w-2xl` |
| Podium detalhes | `PodiumCard.tsx` | `max-w-2xl` |

### 3. Ajustes em cada modal consumidor

Para **todos** os modais listados acima:

- Garantir `DialogHeader` com `DialogTitle` consistente (o estilo centralizado virá do base)
- Garantir `space-y-4` no corpo
- Garantir `DialogFooter` com `gap-3` onde houver botões
- Adicionar `autoFocus` no primeiro input/select de formulários (propriedade `autoFocus` no primeiro `<Input>`)
- Nos botões de ação com loading, garantir pattern: `disabled={saving}` + texto "Salvando..."

### 4. Arquivos afetados

1. `src/components/ui/dialog.tsx` — base styles
2. `src/components/tasks/TaskForm.tsx` — autoFocus no título
3. `src/components/tasks/TaskDetailModal.tsx` — consistência
4. `src/components/tasks/TaskImportDialog.tsx` — tamanho max-w-2xl
5. `src/pages/Team.tsx` — modais inline com max-w-md
6. `src/components/team/EditMemberDialog.tsx` — max-w-md, autoFocus
7. `src/components/team/EditDepartmentDialog.tsx` — max-w-md, autoFocus
8. `src/components/team/CoordinatorLinksTab.tsx` — max-w-md
9. `src/components/settings/RecurrenceSettings.tsx` — autoFocus
10. `src/components/settings/HolidaySettings.tsx` — max-w-md, autoFocus
11. `src/components/dashboard/AIAnalysisDialog.tsx` — consistência
12. `src/components/dashboard/KpiCards.tsx` — consistência
13. `src/components/dashboard/DelayKpiCards.tsx` — consistência
14. `src/components/dashboard/PerformanceAnalytics.tsx` — consistência
15. `src/components/dashboard/PodiumCard.tsx` — consistência
16. `src/components/analysis/AnalysisHistoryDialog.tsx` — consistência

