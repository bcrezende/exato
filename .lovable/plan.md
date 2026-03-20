

## Confirmação antes de gerar tarefa recorrente

### Objetivo
Ao concluir uma tarefa recorrente, em vez de gerar automaticamente a próxima instância, exibir um dialog perguntando ao usuário se deseja gerar. O texto será contextual: "amanhã" para diária, "semana que vem" para semanal, etc.

### Abordagem

A mudança é puramente no **frontend**. A Edge Function continua igual — apenas deixamos de chamá-la automaticamente e passamos a chamá-la só após confirmação.

#### 1. Modificar `updateTaskStatus` em `src/lib/task-utils.ts`
- **Separar** a geração de recorrência da função principal
- A função passa a retornar `{ error, isRecurring }` em vez de chamar a Edge Function diretamente
- Criar nova função exportada `generateNextRecurrence(parentId: string)` que faz o invoke da Edge Function

#### 2. Criar componente `RecurrenceConfirmDialog` em `src/components/tasks/RecurrenceConfirmDialog.tsx`
- Dialog simples com:
  - Título: "Gerar próxima tarefa?"
  - Mensagem contextual baseada no `recurrence_type`: "Deseja gerar a próxima tarefa para **amanhã**?" / "**semana que vem**" / "**mês que vem**" / "**ano que vem**"
  - Para tipos customizados, usar o label da `recurrence_definition` (ex: "a cada 2 dias")
  - Botões: "Não gerar" e "Gerar tarefa"

#### 3. Atualizar os 4 locais que chamam `updateTaskStatus` para completar

Todos seguem o mesmo padrão — após `updateTaskStatus` retornar `isRecurring: true`, abrir o dialog de confirmação:

| Arquivo | Mudança |
|---------|---------|
| `TaskDetailModal.tsx` | Adicionar state para o dialog, abrir após conclusão de recorrente |
| `Tasks.tsx` | Idem — no `executeStatusChange` |
| `MyDayView.tsx` | Idem |
| `AnalystDashboard.tsx` | Idem |

Em cada local:
- Adicionar states: `showRecurrenceConfirm`, `pendingRecurrenceParentId`, `pendingRecurrenceType`
- Após `updateTaskStatus` retornar `isRecurring: true`, setar esses states para abrir o dialog
- No callback de confirmação, chamar `generateNextRecurrence(parentId)`
- No callback de cancelamento, apenas fechar o dialog (tarefa fica concluída, mas sem gerar a próxima)

### Mapeamento de texto contextual

```typescript
function getRecurrenceTimeLabel(recurrenceType: string, definitions?: RecurrenceDefinition[]): string {
  const def = definitions?.find(d => d.key === recurrenceType);
  if (def) {
    if (def.interval_unit === "day") return def.interval_value === 1 ? "amanhã" : `em ${def.interval_value} dias`;
    if (def.interval_unit === "week") return def.interval_value === 1 ? "semana que vem" : `em ${def.interval_value} semanas`;
    if (def.interval_unit === "month") return def.interval_value === 1 ? "mês que vem" : `em ${def.interval_value} meses`;
    if (def.interval_unit === "year") return def.interval_value === 1 ? "ano que vem" : `em ${def.interval_value} anos`;
  }
  // Fallback para tipos legacy
  switch (recurrenceType) {
    case "daily": return "amanhã";
    case "weekly": return "semana que vem";
    case "monthly": return "mês que vem";
    case "yearly": return "ano que vem";
    default: return "no próximo período";
  }
}
```

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/lib/task-utils.ts` — separar geração em função própria |
| Criar | `src/components/tasks/RecurrenceConfirmDialog.tsx` |
| Editar | `src/components/tasks/TaskDetailModal.tsx` |
| Editar | `src/pages/Tasks.tsx` |
| Editar | `src/components/dashboard/MyDayView.tsx` |
| Editar | `src/pages/Dashboard/AnalystDashboard.tsx` |

### Fluxo final

```text
Usuário clica "Concluir" → Seleciona dificuldade → Tarefa marcada como concluída
  ↓
É recorrente? 
  → Sim → Abre dialog "Deseja gerar a próxima tarefa para amanhã?"
            → "Gerar tarefa" → Chama Edge Function → Próxima instância criada
            → "Não gerar" → Fecha dialog, nenhuma instância criada
  → Não → Fluxo normal, sem dialog
```

