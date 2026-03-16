

## Histórico e Download de Análises IA

### 1. Nova tabela `analysis_history`

**Migração SQL** — Criar tabela para armazenar análises geradas:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL) — quem gerou
- `company_id` (uuid, NOT NULL) — isolamento multi-tenant
- `period_label` (text) — ex: "Hoje", "Última semana"
- `sector_name` (text) — ex: "Todos os setores" ou nome do setor
- `employee_name` (text) — ex: "Todos os funcionários" ou nome
- `content` (text, NOT NULL) — markdown da análise
- `created_at` (timestamptz, default now())

**RLS policies:**
- SELECT: usuários podem ver análises da própria company (admin/manager apenas)
- INSERT: admin/manager podem inserir
- DELETE: admin/manager podem deletar da própria company

### 2. Atualizar `src/pages/Analysis.tsx`

Após receber o resultado da IA, salvar automaticamente na tabela `analysis_history`.

Adicionar seção **"Histórico de Análises"** abaixo do resultado (ou quando não há resultado), mostrando uma tabela/lista com:
- Data de criação
- Filtros usados (período, setor, funcionário)
- Botões: **Visualizar** (abre o conteúdo em um dialog) e **Download TXT**

**Download TXT:** Função client-side que cria um `Blob` com o conteúdo markdown e dispara download via `URL.createObjectURL`.

### 3. Componente de visualização

Dialog simples para exibir uma análise do histórico com `ReactMarkdown`, reutilizando o mesmo estilo do resultado atual.

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar tabela `analysis_history` + RLS |
| `src/pages/Analysis.tsx` | Salvar análise, listar histórico, download TXT, dialog de visualização |

