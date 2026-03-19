
## Diagnóstico confirmado

O problema não é um único ponto; são 4 causas combinadas:

1. **Falhas intermitentes no backend de autenticação e leitura inicial**
   - Os logs mostram `POST /token` levando **8–11s** e às vezes retornando **500/504**.
   - Também houve falha em `profiles` e timeout em `user_roles`.
   - Quando isso acontece, o app entra em estado de espera e parece “loading infinito”.

2. **Fluxos de loading frágeis**
   - `AuthContext`, `Dashboard`, `Team`, `Analysis`, `MyDay` e outros componentes usam loading com caminho feliz.
   - Se uma request falha ou expira, o `loading` pode nunca ser encerrado.

3. **Bundle inicial pesado demais**
   - Mesmo abrindo `/dashboard`, o app carrega código de outras rotas e módulos pesados.
   - A medição mostrou **First Paint ~5.6s** e carregamento de scripts grandes como `xlsx`, `recharts`, `TaskImportDialog`, `Team`, `TaskForm`, `TaskCalendar`.
   - Isso indica falta de **code-splitting real por rota e por feature**.

4. **Consultas amplas e duplicadas**
   - Há muitos `select("*")`, consultas de tabelas inteiras e duplicação de dados já buscados.
   - Exemplo: o Dashboard busca `profiles`, e `DelayKpiCards` busca `profiles` novamente.
   - Várias telas carregam tudo antes de renderizar qualquer coisa.

Importante: **o volume de dados ainda é pequeno**, então a lentidão atual é mais de arquitetura, loading, rede e estratégia de carregamento do que de tamanho da base.

## Plano para sanar a lentidão

### 1. Blindar autenticação e acabar com loading infinito
- Refatorar `AuthContext` para usar `try/catch/finally` em toda inicialização.
- Separar:
  - `authLoading` = sessão/autenticação
  - `profileLoading` = perfil/papel
- Garantir que nenhuma falha deixe spinner eterno.
- Se `profile`/`role` falhar:
  - mostrar estado de erro com retry
  - ou permitir renderizar layout mínimo sem travar tudo
- Ajustar `ProtectedRoute` para não depender de um único loading global frágil.

### 2. Implementar code-splitting de verdade
- Tornar **todas as páginas lazy** em `App.tsx`:
  - Dashboard
  - Tasks
  - Team
  - Analysis
  - Settings
  - MyDay
- Lazy-load de módulos pesados dentro das páginas:
  - `TaskImportDialog` / `xlsx`
  - `TaskCalendar`
  - analytics/charts
- Objetivo: abrir login/dashboard sem baixar código de telas que o usuário nem acessou.

### 3. Reorganizar o carregamento por prioridade
- Em cada rota, carregar primeiro o mínimo para a tela aparecer.
- Carregar cards, gráficos e painéis secundários depois.
- Trocar `Promise.all` por `Promise.allSettled` onde um bloco não deve travar a página inteira.
- Se um widget falhar, só ele mostra erro/retry; a página continua utilizável.

### 4. Reduzir queries excessivas e duplicadas
- Substituir `select("*")` por colunas mínimas.
- Parar de buscar as mesmas entidades em múltiplos componentes.
- Passar dados já carregados do pai para os filhos quando fizer sentido.
- Limitar consultas históricas:
  - `task_time_logs`
  - `task_delays`
  - análises
- Revisar Dashboard, Tasks, Team e Analysis para não recarregar tudo a cada navegação.

### 5. Introduzir cache compartilhado de dados
- Usar a infraestrutura já existente de React Query para cachear:
  - sessão/perfil/papel
  - departments
  - profiles
  - notifications
  - tasks por contexto
- Reaproveitar dados entre rotas em vez de refazer fetch toda vez.
- Fazer prefetch do básico após login bem-sucedido.

### 6. Endurecer consultas do banco para escala e estabilidade
- Adicionar índices para filtros mais usados:
  - `tasks(company_id, assigned_to, department_id, status, due_date, start_date)`
  - `task_time_logs(task_id, created_at)`
  - `task_delays(task_id, created_at)`
  - `profiles(company_id, department_id)`
- Revisar as consultas ligadas a `profiles` e `user_roles`, porque hoje elas fazem parte do gargalo de entrada.
- Se os timeouts de `/token` continuarem mesmo após os ajustes do app, tratar isso como **incidente de backend** separado da interface.

### 7. Melhorar observabilidade
- Adicionar tratamento explícito de erro e retry nas telas.
- Medir tempos de:
  - login
  - bootstrap do auth
  - carregamento de cada rota
  - carregamento de cada widget
- Isso vai permitir identificar rapidamente o próximo gargalo real, em vez de depender só de percepção visual.

## Ordem de implementação

1. **Auth + loading states**
2. **Lazy loading por rota**
3. **Queries críticas do Dashboard/Tasks**
4. **Cache compartilhado**
5. **Índices e refinamento de consultas**
6. **Observabilidade e limpeza final**

## Arquivos mais impactados

- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/App.tsx`
- `src/pages/Login.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Tasks.tsx`
- `src/pages/Team.tsx`
- `src/pages/Analysis.tsx`
- `src/components/dashboard/DelayKpiCards.tsx`
- `src/components/NotificationBell.tsx`

## Resultado esperado

- Fim do **loading infinito**
- Entrada mais rápida após login
- Dashboard aparecendo primeiro e widgets secundários carregando depois
- Menos requests duplicadas entre páginas
- Melhor navegação entre rotas
- Projeto preparado para crescer sem voltar a ficar pesado

## Detalhes técnicos

```text
Problema atual:
Login/Auth instável + loading sem fallback
        +
Bundle inicial pesado
        +
Consultas amplas/duplicadas
        +
Widgets bloqueando render

Arquitetura alvo:
Sessão rápida -> layout renderiza -> dados críticos entram -> widgets secundários carregam em paralelo -> cache reaproveita entre rotas
```
