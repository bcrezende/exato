

## Adicionar confirmações antes de ações destrutivas/importantes

### Resumo

Criar um componente reutilizável `ConfirmActionDialog` usando `AlertDialog` e integrá-lo em todos os pontos onde o usuário executa exclusões, edições ou salvamentos sem confirmação prévia.

### Locais identificados

| Local | Ação sem confirmação | Tipo |
|---|---|---|
| `Tasks.tsx` | Excluir tarefa (Kanban + Lista) | Exclusão |
| `TaskDetailModal.tsx` | Excluir tarefa | Exclusão |
| `Team.tsx` | Excluir setor | Exclusão |
| `Team.tsx` | Excluir convite | Exclusão |
| `CoordinatorLinksTab.tsx` | Remover vínculo coordenador-analista | Exclusão |
| `HolidaySettings.tsx` | Excluir feriado | Exclusão |
| `WhatsNewAdmin.tsx` | Excluir novidade | Exclusão |
| `RecurrenceSettings.tsx` | Excluir recorrência | Exclusão |
| `AnalysisHistoryTable.tsx` | Excluir análise | Exclusão |
| `NotificationBell.tsx` | Limpar todas notificações | Exclusão |
| `EditMemberDialog.tsx` | Salvar edição de membro | Salvamento |
| `EditDepartmentDialog.tsx` | Salvar edição de setor | Salvamento |
| `TaskForm.tsx` | Salvar/criar tarefa | Salvamento |
| `Settings.tsx` | Salvar perfil / empresa | Salvamento |

### Detalhes técnicos

**1. Novo componente `src/components/ui/confirm-action-dialog.tsx`**

- Componente reutilizável baseado em `AlertDialog`
- Props: `open`, `onConfirm`, `onCancel`, `title`, `description`, `confirmLabel`, `variant` (destructive | default)
- Variante `destructive` para exclusões (botão vermelho), `default` para salvamentos

**2. Integração nos arquivos**

Para **exclusões**: envolver cada `handleDelete` / `delete` em um state `confirmDelete` que abre o dialog antes de executar.

Para **salvamentos importantes** (edição de membro, setor, perfil): adicionar confirmação antes do `handleSave`.

> Nota: Criação de tarefas e convites **não** terão confirmação (o ato de preencher o formulário já é intencional o suficiente). Apenas edições/atualizações e exclusões.

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/ui/confirm-action-dialog.tsx` | Novo componente reutilizável |
| `src/pages/Tasks.tsx` | Confirmação antes de excluir tarefa |
| `src/components/tasks/TaskDetailModal.tsx` | Confirmação antes de excluir tarefa |
| `src/pages/Team.tsx` | Confirmação antes de excluir setor e convite |
| `src/components/team/CoordinatorLinksTab.tsx` | Confirmação antes de remover vínculo |
| `src/components/settings/HolidaySettings.tsx` | Confirmação antes de excluir feriado |
| `src/components/settings/WhatsNewAdmin.tsx` | Confirmação antes de excluir novidade |
| `src/components/settings/RecurrenceSettings.tsx` | Confirmação antes de excluir recorrência |
| `src/components/analysis/AnalysisHistoryTable.tsx` | Confirmação antes de excluir análise |
| `src/components/NotificationBell.tsx` | Confirmação antes de limpar notificações |
| `src/components/team/EditMemberDialog.tsx` | Confirmação antes de salvar edição |
| `src/components/team/EditDepartmentDialog.tsx` | Confirmação antes de salvar edição |

