

## Plano: Import de Tarefas via Excel

### Formato do Excel

O arquivo `.xlsx` deve conter uma planilha com as seguintes colunas (na primeira linha como cabeçalho):

| Coluna | Obrigatória | Valores aceitos | Exemplo |
|---|---|---|---|
| **titulo** | Sim | Texto livre | "Revisar relatório mensal" |
| **descricao** | Não | Texto livre | "Verificar dados do Q1" |
| **responsavel_email** | Sim | Email do membro cadastrado | "joao@empresa.com" |
| **setor** | Sim | Nome exato do setor cadastrado | "Financeiro" |
| **data_inicio** | Sim | DD/MM/AAAA HH:MM ou DD/MM/AAAA | "15/03/2026 09:00" |
| **data_termino** | Sim | DD/MM/AAAA HH:MM ou DD/MM/AAAA | "20/03/2026 18:00" |
| **recorrencia** | Sim | nenhuma, diaria, semanal, mensal, anual | "semanal" |

### Implementação

**1. Instalar biblioteca `xlsx`** para parsear arquivos Excel no frontend.

**2. Novo componente `src/components/tasks/TaskImportDialog.tsx`**
- Dialog com drag-and-drop ou botão de upload para arquivo `.xlsx`
- Parseia o Excel no frontend usando `xlsx`
- Valida cada linha: campos obrigatórios, email existente nos membros, setor existente nos departamentos, datas válidas
- Exibe preview das tarefas com indicação de erros por linha
- Botão "Importar X tarefas" insere todas as válidas no banco via `supabase.from("tasks").insert()`
- Exibe resumo: X criadas, Y com erro

**3. `src/pages/Tasks.tsx`**
- Adicionar botão "Importar Excel" ao lado do botão "Nova Tarefa" (visível apenas para admin/manager)
- Controlar abertura do `TaskImportDialog`

### Fluxo do usuário
1. Clica em "Importar Excel"
2. Seleciona o arquivo `.xlsx`
3. Vê preview com validação (linhas verdes = OK, vermelhas = erro)
4. Confirma importação
5. Tarefas criadas aparecem na lista

### Arquivos alterados/criados
- **Novo**: `src/components/tasks/TaskImportDialog.tsx`
- **Editado**: `src/pages/Tasks.tsx` — botão de importação
- **Dependência**: `xlsx` (pacote npm)

