
Objetivo

Restabelecer o login e eliminar o cenário em que o usuário clica em “Entrar” e o app fica parado/carregando indefinidamente.

Diagnóstico

- O botão de login em si está funcionando; o formulário envia normalmente.
- As políticas de acesso de `profiles` e `user_roles` permitem leitura do próprio usuário, então o problema principal não parece ser bloqueio de permissão.
- O gargalo está no pós-login:
  - `AuthContext` define `user/session` antes de concluir `profile/role`
  - `ProtectedRoute` libera a área protegida cedo demais
  - `Dashboard` cai no fluxo errado quando `role` ainda é `null`
  - o efeito interno aborta (`if !user || !role || !profile return`) e o loading local pode ficar preso para sempre
- Os logs do backend também mostram instabilidade real no auth (`/token` com 500/504 e timeouts). Então hoje existem 2 problemas combinados:
  1. estado de autenticação frágil no frontend
  2. instabilidade intermitente no backend de autenticação

Plano

1. Reestruturar o bootstrap de autenticação
- Ajustar `AuthContext` para separar claramente:
  - sessão autenticada
  - identidade pronta (`profile + role`)
  - erro recuperável
- Tratar falha de `profiles` e `user_roles` individualmente, sem deixar estado “meio pronto”.
- Considerar ausência de `profile` ou `role` como erro explícito, não como sucesso parcial.

2. Corrigir o gate das rotas protegidas
- Em `ProtectedRoute`, só renderizar a aplicação quando a identidade estiver realmente pronta.
- Se houver usuário autenticado mas `role/profile` faltando, mostrar tela de recuperação com retry e saída, em vez de deixar entrar no app incompleto.

3. Corrigir a corrida do login
- Em `Login.tsx`, remover a dependência de navegação imediata como única estratégia.
- Fazer o redirecionamento acontecer somente quando o contexto confirmar que a autenticação terminou de carregar corretamente.

4. Blindar o Dashboard e páginas protegidas
- Em `Dashboard.tsx`, não assumir fluxo de admin/manager quando `role` for `null`.
- Adicionar fallback explícito para auth incompleto.
- Revisar outras páginas/componentes que dependem de `useAuth` para não iniciar consultas enquanto a identidade ainda não estiver pronta.

5. Tratar a instabilidade do backend sem travar a UI
- Adicionar estados claros para timeout/erro de autenticação.
- Se o backend falhar, a UI deve mostrar erro e opção de retry, nunca spinner infinito.
- Revalidar os logs de auth após os ajustes do cliente para separar bug de app de incidente de infraestrutura.

6. Validar os fluxos críticos
- Testar:
  - login com credencial inválida
  - login com credencial válida
  - refresh com usuário já autenticado
  - logout
  - aceite de convite
  - redefinição de senha
- Confirmar que nenhum fluxo fica preso em loading/skeleton.

Arquivos principais

- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/pages/Login.tsx`
- `src/pages/Dashboard.tsx`
- revisão secundária em páginas/componentes que usam `useAuth`

Detalhes técnicos

```text
Hoje:
signIn -> user/session entram -> rota protegida abre cedo -> role/profile ainda nulos ->
Dashboard aborta inicialização -> loading interno pode ficar infinito

Depois:
signIn -> sessão confirmada -> profile/role resolvidos ou erro recuperável ->
só então a rota protegida libera a aplicação
```
