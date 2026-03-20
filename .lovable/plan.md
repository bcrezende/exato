

## Adicionar Campo "Justificativa" na Edição de Tarefas

### Objetivo
Permitir que o usuário justifique atrasos ou demoras ao editar uma tarefa. O campo aparece apenas no modo de edição (não na criação).

### Mudanças necessárias

#### 1. Banco de dados — nova coluna `justification`
Migration SQL:
```sql
ALTER TABLE public.tasks ADD COLUMN justification text;
```

#### 2. `TaskForm.tsx` — adicionar campo no formulário de edição
- Adicionar `justification` ao estado do form (`getInitialForm` e `form`)
- Renderizar um `Textarea` com label "Justificativa" **somente quando `editing` não é null**
- Incluir `justification` no payload de `handleSave`

#### 3. `TaskDetailModal.tsx` — exibir justificativa
- Se `localTask.justification` existir, mostrar na seção de detalhes com ícone e label "Justificativa:"

### Arquivos

| Ação | Arquivo |
|------|---------|
| Migration | Nova coluna `justification` na tabela `tasks` |
| Editar | `src/components/tasks/TaskForm.tsx` |
| Editar | `src/components/tasks/TaskDetailModal.tsx` |

### Comportamento
- Campo opcional, sem validação obrigatória
- Visível apenas na edição, não na criação de tarefas
- Exibido no modal de detalhes quando preenchido

