

## Corrigir Function Search Path Mutable

### Problema

4 funções do sistema de email queue não definem `SET search_path`, o que o linter do Supabase marca como vulnerabilidade. Sem search_path fixo, um schema malicioso poderia interceptar chamadas.

### Solução

Migração SQL para recriar as 4 funções com `SET search_path TO 'public'` adicionado.

### Detalhes técnicos

```sql
CREATE OR REPLACE FUNCTION public.delete_email(...) SET search_path TO 'public'
CREATE OR REPLACE FUNCTION public.move_to_dlq(...) SET search_path TO 'public'
CREATE OR REPLACE FUNCTION public.read_email_batch(...) SET search_path TO 'public'
CREATE OR REPLACE FUNCTION public.enqueue_email(...) SET search_path TO 'public'
```

Cada função mantém exatamente a mesma lógica, apenas adicionando a cláusula `SET search_path`.

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| Migração SQL | Recriar 4 funções com `SET search_path TO 'public'` |

