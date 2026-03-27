

## Exibir dias no tempo de execução quando > 24h

### Mudança

Atualizar a função `formatDuration` em `src/components/tasks/TaskDetailModal.tsx` (linhas 37-43) para incluir dias:

```typescript
function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} dia${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}min`);
  return parts.join(' ');
}
```

Exemplo: `91h 15min` → `3 dias 19h 15min`

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `src/components/tasks/TaskDetailModal.tsx` | Atualizar `formatDuration` para incluir dias |

