

## Diagnóstico: Login ainda trava por instabilidade do banco

### Situação atual
- A limpeza dos cron jobs e `net._http_response` funcionou (0 entradas, 1 cron ativo)
- Porém o banco de dados continua intermitentemente irresponsivo (até `SELECT 1` dá timeout)
- A chamada `signInWithPassword` fica pendente sem timeout, travando o botão para sempre
- O fix do `profileError` não cobre o caso em que **a própria autenticação** trava (só cobre quando auth sucede mas profile falha)

### Plano de ação

#### 1. Adicionar timeout na chamada de login (`src/pages/Login.tsx`)
- Envolver `signInWithPassword` com um `Promise.race` e timeout de 15 segundos
- Se expirar, mostrar toast de erro e resetar o botão
- Isso garante que o botão **nunca** fique travado indefinidamente

#### 2. Adicionar índices para otimizar RLS (`migração SQL`)
- Criar índices em `profiles(company_id)` e `user_roles(user_id)` 
- As RLS policies fazem subconsultas nestas colunas em cada query
- Sem índices, cada avaliação de policy faz sequential scan, amplificando a carga

#### 3. Terminar conexões idle-in-transaction (`migração SQL`)
- Configurar `idle_in_transaction_session_timeout` para 30 segundos
- Conexões presas em transação aberta são liberadas automaticamente
- Isso previne saturação do pool de conexões

### Arquivos impactados
- `src/pages/Login.tsx` -- timeout na chamada de auth
- Migração SQL -- índices + configuração de timeout de sessão

### Resultado esperado
- Botão de login nunca fica travado mais que 15 segundos
- Queries de RLS ficam mais rápidas com índices
- Conexões presas são liberadas automaticamente

