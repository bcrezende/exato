
Objetivo: corrigir os erros de importação `"Responsável ... não encontrado"` e `"Setor ... não encontrado"` no fluxo de Excel.

Diagnóstico (com base no código atual + logs):
1) O `TaskImportDialog` hoje monta `emailToProfileId` apenas com o email do usuário logado.  
   Resultado: qualquer outro email (como `brunorezende185@gmail.com`) falha no match.
2) A validação de setor está frágil (comparação literal) e, para gerente, deveria seguir a regra já existente no produto: tarefa vinculada ao setor do próprio gerente.
3) Há risco de corrida de carregamento em `Tasks.tsx` (busca depende só de `user`), podendo abrir importação com listas incompletas em alguns cenários.

Plano de implementação:
1) Backend (migration SQL): criar função segura para resolver responsáveis por email
   - Criar `public.get_task_import_assignees()` (`SECURITY DEFINER`) retornando `profile_id`, `email`, `full_name`, `department_id`.
   - Filtrar por `company_id` do usuário autenticado.
   - Restringir por papel:
     - admin: todos da empresa;
     - manager: apenas membros do próprio setor.
   - Isso elimina heurística frágil por convites e resolve o match real email → profile.

2) `src/components/tasks/TaskImportDialog.tsx`
   - Trocar a lógica atual de `fetchEmailMap` por chamada RPC `get_task_import_assignees`.
   - Montar mapas normalizados:
     - `email -> profile_id`
     - fallback por `full_name -> profile_id` (também normalizado).
   - Adicionar normalização robusta de texto (trim, lowercase, remover acentos, colapsar espaços) para:
     - responsável,
     - setor,
     - recorrência.
   - Regra de setor por papel:
     - admin: valida setor da planilha contra lista de departamentos (com normalização).
     - manager: usar `profile.department_id` como fonte de verdade; setor da planilha só valida consistência (mensagem clara se divergir), sem depender de match literal em lista.
   - Melhorar mensagens de erro:
     - “Responsável não encontrado no seu escopo de importação” (quando gerente tentar fora do setor),
     - “Setor inválido para o seu perfil” (quando aplicável).

3) `src/pages/Tasks.tsx`
   - Ajustar `useEffect` de carga para depender também de `currentProfile?.company_id` (e `role` se necessário), garantindo `members/departments` atualizados antes da importação.

Detalhes técnicos:
- Arquivos a alterar:
  - `supabase/migrations/<timestamp>_task_import_assignees_rpc.sql`
  - `src/components/tasks/TaskImportDialog.tsx`
  - `src/pages/Tasks.tsx`
- Sem alteração de schema de tabelas; apenas nova função SQL e ajustes de frontend.
- Segurança:
  - função retorna somente usuários do mesmo tenant (empresa);
  - gerente continua restrito ao próprio setor, alinhado com as regras já existentes.

Critério de aceite:
1) Com o arquivo anexado, `Financeiro` deve ser reconhecido.
2) `brunorezende185@gmail.com` deve resolver corretamente quando estiver no escopo permitido.
3) Importação não deve mais acusar “não encontrado” por falha de mapeamento técnico.
4) Fluxo continua respeitando isolamento por papel (admin global, gerente setorial).
