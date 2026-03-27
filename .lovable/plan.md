

## Transformar totalizadores da linha expansível em mini-cards

### Mudança

Substituir os `<span>` de texto simples na linha do `CollapsibleTrigger` por pequenos cards estilizados inline, com fundo colorido sutil, borda arredondada e ícone.

### Implementação

Nos dois dashboards (`AuditDashboard.tsx` e `MonitoringDashboard.tsx`), trocar o bloco de spans por mini-cards assim:

```tsx
// De:
<span className="text-orange-600">{sector.notDone} não exec.</span>

// Para:
<div className="flex items-center gap-1 rounded-md border px-2 py-1 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
  <XCircle className="h-3 w-3 text-orange-600" />
  <span className="text-xs font-medium text-orange-600">{sector.notDone}</span>
  <span className="text-[10px] text-orange-500">não exec.</span>
</div>
```

Cada métrica terá seu próprio mini-card com:
- Fundo sutil na cor correspondente (`bg-{color}-50` / dark mode `bg-{color}-950/30`)
- Borda na cor (`border-{color}-200`)
- Ícone pequeno (3x3) + valor em negrito + label

**Auditoria** (4 mini-cards): Não Exec. (laranja), Início Atras. (âmbar), Concl. Atras. (vermelho), No Prazo (verde)

**Monitoramento** (4 mini-cards): Início Atras. (âmbar), Atrasadas (vermelho), Concluídas (verde), Pendentes (laranja)

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/AuditDashboard.tsx` | Spans → mini-cards na linha do setor |
| `src/pages/Dashboard/MonitoringDashboard.tsx` | Spans → mini-cards na linha do setor |

