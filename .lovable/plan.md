

## Plano: Corrigir importação Excel — datas e responsável por email

### Problemas encontrados

1. **Datas sempre vazias**: Na linha 150, quando o valor é um `Date` (vindo do `cellDates: true`), o código converte para string vazia `""`. A validação nas linhas 167-168 verifica `dataInicio`/`dataTermino` (que são strings), encontra vazio, e retorna erro antes mesmo de chegar no código que verifica os `rawValues` como objetos `Date`.

2. **Responsável por email não funciona**: O código só faz match por `full_name` (linha 175), mas o Excel contém emails. A função `fetchMemberEmails` nunca é chamada e está incompleta.

### Solução

**`src/components/tasks/TaskImportDialog.tsx`** — três correções:

1. **Datas**: Remover a validação de `dataInicio`/`dataTermino` como strings obrigatórias. Em vez disso, validar após o parsing completo — verificar se `startDate`/`dueDate` foram resolvidos (seja via Date object ou string parsed). Mover a lógica de parsing de datas para antes da validação de campos obrigatórios.

2. **Match por email**: Ao abrir o dialog, buscar emails dos membros via tabela `invitations` (accepted). Criar um mapa `email → profile_id`. No matching do responsável, tentar primeiro por email, depois por `full_name` como fallback.

3. **Limpar código morto**: Remover comentários extensos e a função `fetchMemberEmails` incompleta, substituindo por uma implementação funcional.

### Arquivos alterados
- **`src/components/tasks/TaskImportDialog.tsx`** — corrigir validação de datas e adicionar match por email

