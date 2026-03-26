
## Diagnóstico da task `52e7e102-2faa-4413-8a3b-bc8314aaff0b`

### O que já confirmei
- A task está `pending`
- `start_date = 14:15`
- `due_date = 14:30`
- empresa com fuso `America/Sao_Paulo`
- o job `check-task-notifications` está ativo e roda `* * * * *`
- não existe registro em `task_email_notifications` para essa task
- não existe registro correspondente em `email_send_log`
- não há preferência do usuário desativando esses emails (`user_notification_preferences` sem linha = padrão ativo)

### Evidência do problema
Nos logs da função `check-task-notifications`, essa task aparece várias vezes com:
- `late_start` → `401 Unauthorized`
- `overdue` → `401 Unauthorized`

E a função `send-transactional-email` não tem log dessa task, o que mostra que a requisição está sendo bloqueada antes mesmo de entrar na função de envio.

## Causa raiz

A task foi detectada corretamente para disparo, mas a chamada interna entre funções ainda está falhando na autenticação do gateway.

Hoje `check-task-notifications` chama `send-transactional-email` por HTTP com:
- `Authorization: Bearer <service_role>`

Só que a função de destino está com `verify_jwt = true`, e o gateway está rejeitando essa chamada com `401`. Por isso:
1. o evento de atraso é identificado;
2. a tentativa de envio acontece;
3. o gateway bloqueia;
4. o email não entra na fila;
5. nada aparece no monitor de emails.

## Plano para sanar

### 1. Corrigir a autenticação da chamada interna
Ajustar `supabase/functions/check-task-notifications/index.ts` para enviar também o header `apikey`, além do `Authorization`, na chamada para `send-transactional-email`.

### 2. Melhorar o diagnóstico de erro
Ajustar o tratamento da resposta HTTP para:
- suportar resposta não-JSON
- logar corpo bruto, status e tipo da notificação
- facilitar identificar falhas de gateway sem ambiguidade

### 3. Melhorar a observabilidade no painel
Registrar falhas de despacho anteriores ao enfileiramento para que o Master Admin consiga ver esse tipo de erro no painel de monitoramento, e não apenas nos logs técnicos.

### 4. Revalidar com esta mesma task
Como não há linha em `task_email_notifications`, não precisa limpar nada. Depois da correção, essa task ainda pode disparar:
- `late_start`
- `overdue`
enquanto continuar `pending`.

### 5. Teste final controlado
Depois da correção:
- testar novamente esta task
- criar uma nova task com início em 6–7 minutos
- validar lembrete, atraso e visibilidade no monitor

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/check-task-notifications/index.ts` | Corrigir headers da chamada e melhorar logs |
| `src/pages/EmailMonitor.tsx` e/ou backend de log | Exibir falhas técnicas pré-fila no monitor |

## Conclusão objetiva

O email não foi disparado porque o sistema detectou o atraso da task, mas a chamada interna para a função de envio está sendo rejeitada com `401 Unauthorized` antes do email entrar na fila.
