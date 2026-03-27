

## Incluir o próprio coordenador nos dashboards Audit e Monitoring

### Problema

Na linha 117-119 de ambos os dashboards, o filtro para coordenadores só inclui os IDs dos analistas vinculados (`coordinatorAnalystIds`), excluindo o próprio coordenador.

### Solução

Adicionar `profile.id` ao `Set` de IDs visíveis para coordenadores:

```typescript
} else if (role === "coordinator") {
  const ids = new Set(coordinatorAnalystIds);
  ids.add(profile?.id);
  filtered = filtered.filter((t) => t.assigned_to && ids.has(t.assigned_to));
}
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/AuditDashboard.tsx` | Adicionar `profile.id` ao Set de IDs do coordenador |
| `src/pages/Dashboard/MonitoringDashboard.tsx` | Mesma correção |

