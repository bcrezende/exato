

## Sistema de Anexos para Tarefas

### Estado Atual

- A tabela `task_attachments` já existe com colunas: `id`, `task_id`, `user_id`, `file_name`, `file_url`, `created_at`
- O bucket `task-attachments` já existe (privado)
- RLS policies já existem para SELECT, INSERT e DELETE
- Faltam colunas: `file_type`, `file_size`, `storage_path`
- Nenhum componente de UI existe ainda

### Plano

**1. Migração de banco de dados**

Adicionar colunas faltantes à tabela existente:
- `file_type TEXT` (nullable para compatibilidade com dados existentes)
- `file_size BIGINT` (nullable)
- `storage_path TEXT` (nullable)

Adicionar policy de storage no bucket `task-attachments` para upload/download/delete por usuários autenticados.

**2. Componente `TaskAttachments.tsx`**

Novo componente em `src/components/tasks/TaskAttachments.tsx` que:
- Lista anexos da tarefa com ícone por tipo, nome, tamanho
- Botão de upload com validação (tipos: imagens, PDF, Word, Excel, TXT; máx 5MB)
- Download via URL assinada (`createSignedUrl`)
- Exclusão permitida para quem anexou ou admin
- Input file oculto acionado por botão "+ Anexar Arquivo"

**3. Integração no `TaskDetailModal.tsx`**

Adicionar seção de anexos (com ícone 📎 e contagem) abaixo dos detalhes da tarefa, renderizando `<TaskAttachments taskId={localTask.id} />`.

### Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| Migração SQL | Adicionar colunas `file_type`, `file_size`, `storage_path`; policies de storage |
| `src/components/tasks/TaskAttachments.tsx` | Novo componente completo |
| `src/components/tasks/TaskDetailModal.tsx` | Importar e renderizar `TaskAttachments` |

### Detalhe Técnico

```typescript
// Upload flow
const path = `${taskId}/${crypto.randomUUID()}_${file.name}`;
await supabase.storage.from("task-attachments").upload(path, file);
await supabase.from("task_attachments").insert({
  task_id, user_id, file_name, file_url: path,
  file_type: file.type, file_size: file.size, storage_path: path
});

// Download flow
const { data } = await supabase.storage
  .from("task-attachments")
  .createSignedUrl(storagePath, 60);

// Validação
const ALLOWED = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
```

