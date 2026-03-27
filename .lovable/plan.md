

## Título dinâmico no navegador por rota

### Solução

Criar um componente `useDocumentTitle` (ou inline no `AppLayout`) que atualiza `document.title` baseado no `location.pathname`.

### Mapeamento de rotas

| Rota | Título |
|---|---|
| `/dashboard` | Dashboard \| Exato |
| `/tasks` | Tarefas \| Exato |
| `/my-day` | Meu Dia \| Exato |
| `/team` | Equipe \| Exato |
| `/team/monitoring` | Minha Equipe \| Exato |
| `/team/monitoring/:id` | Detalhe Analista \| Exato |
| `/analysis` | Análise IA \| Exato |
| `/settings` | Configurações \| Exato |
| `/email-monitor` | Monitorar Emails \| Exato |
| `/audit-log` | Auditoria \| Exato |
| `/login` | Login \| Exato |
| fallback | Exato |

### Implementação

1. Criar `src/hooks/useDocumentTitle.ts` com um `useEffect` que observa `location.pathname` e define `document.title`
2. Chamar o hook em `AppLayout.tsx` (rotas autenticadas) e nas páginas públicas (Login, Register, etc.) ou num wrapper global no `App.tsx`

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useDocumentTitle.ts` | Novo hook com mapeamento rota → título |
| `src/components/AppLayout.tsx` | Chamar `useDocumentTitle()` |
| `src/pages/Login.tsx` | Chamar `useDocumentTitle()` (ou resolver globalmente) |

