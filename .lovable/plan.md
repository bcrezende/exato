

## Reverter tarefas incorretamente marcadas como "não feitas" para pendente

### O que será feito

Executar duas operações de dados (sem alteração de schema):

1. **Reverter status das 11 tarefas** de `not_done` para `pending`
2. **Remover os logs correspondentes** da tabela `task_not_done_logs` para que o modal de resolução não apareça mais

### Tarefas afetadas

| Usuário | Qtd | Prazos |
|---|---|---|
| Laura Rejane Cavalcanti Rezende | 9 | 23/03 e 24/03 |
| teste analista | 1 | 23/03 |
| teste coordenador | 1 | 23/03 |

### Operações SQL (via insert tool)

```sql
-- 1. Reverter status para pending
UPDATE tasks SET status = 'pending'
WHERE id IN (
  '6bfe3046-eafc-45ef-888b-9d4e6d7a2ab2',
  '11c3c6c8-05d9-4692-9d4b-bcf6765f9a43',
  '7ccd2834-4b7b-4f9a-b628-74645ff952bd',
  '8e286eb3-e19e-47da-bbc2-002d76ad7353',
  'beb3a437-002e-4ba5-85fc-b4e6ec7ed58b',
  'dfa5315c-af12-4fd9-849b-531f8a3def6e',
  '1fab097f-6065-4c2a-891a-aea42187051f',
  'edd434f5-3ff6-4520-99f4-d3412f29822c',
  'a8e1f9a4-8845-47a1-b218-13856d12e2a9',
  '12dc2470-3bf2-4157-b300-3e4097ee5d1e',
  '497d7021-3261-42d3-8625-1dac9bb33342'
);

-- 2. Remover os logs auto-gerados pendentes
DELETE FROM task_not_done_logs
WHERE task_id IN (/* mesmos IDs */)
  AND auto_generated = true
  AND next_action = 'Aguardando ação do usuário';
```

Nenhuma alteração de código necessária — apenas correção de dados no banco.

