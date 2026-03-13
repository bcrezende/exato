

## Plano: Corrigir parsing de datas no import Excel

### Problema
O Excel armazena datas como números seriais internamente (ex: `46094.3125`). A biblioteca `xlsx` retorna esses números brutos ao invés de strings formatadas. O `parseBrDate` tenta fazer parse de string `DD/MM/AAAA`, mas recebe um número serial, e a conversão via `XLSX.SSF.parse_date_code` existe no código mas falha porque o valor já foi convertido para string na normalização.

### Solução

**`src/components/tasks/TaskImportDialog.tsx`** — duas alterações:

1. **Ler o Excel com `cellDates: true`** para que datas sejam convertidas em objetos `Date` automaticamente:
```ts
const wb = XLSX.read(data, { type: "array", cellDates: true });
```

2. **Na normalização dos valores**, verificar se o valor é um `Date` object antes de converter para string. Se for `Date`, formatar diretamente como ISO string ao invés de tentar parsear depois:
```ts
// No loop de normalização, manter o valor original se for Date
const rawValues: Record<string, any> = {};
for (const key of Object.keys(row)) {
  rawValues[key.toLowerCase().trim()] = row[key];
}
```

3. **No parsing de datas**, aceitar objetos `Date` diretamente:
```ts
// Se o valor já é um Date (cellDates: true), usar direto
if (rawValue instanceof Date && !isNaN(rawValue.getTime())) {
  startDate = rawValue.toISOString();
} else {
  // fallback para parse de string DD/MM/AAAA
}
```

### Arquivos alterados
- **`src/components/tasks/TaskImportDialog.tsx`** — corrigir leitura de datas do Excel

