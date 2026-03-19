

## Substituir Seletor de Data/Hora por DatePicker + Time Select

### Resumo

Trocar os dois campos `<input type="datetime-local">` por um grid 2x2 com DatePicker (calendário popover do shadcn) + Select de hora (intervalos de 15min), com validação visual, sugestão automática de duração de 1h, e formato brasileiro DD/MM/YYYY.

### Arquivo a editar

`src/components/tasks/TaskForm.tsx`

### Mudanças

**1. Imports adicionais:**
- `Calendar` de `@/components/ui/calendar`
- `Popover`, `PopoverTrigger`, `PopoverContent` de `@/components/ui/popover`
- `CalendarIcon`, `Clock` de `lucide-react`
- `format` de `date-fns`
- `ptBR` de `date-fns/locale/pt-BR`

**2. Gerar opções de hora:**
- Array de strings de 00:00 a 23:45 em intervalos de 15min
- Usado em dois `Select` (hora início e hora término)

**3. Separar estado do form:**
- `start_date` e `due_date` continuam como strings `"YYYY-MM-DDTHH:MM"` (compatível com `localInputToISO`)
- Internamente, extrair/compor data e hora separadamente nos handlers
- Helper: `extractDate(dtStr) → Date | undefined`, `extractTime(dtStr) → string`, `composeDatetime(date, time) → string`

**4. Layout do grid 2x2 (linhas 308-330):**
```
Linha 1: [📅 Data Início (DatePicker)] [🕐 Hora Início (Select 15min)]
Linha 2: [📅 Data Término (DatePicker)] [🕐 Hora Término (Select 15min)]
```

Cada DatePicker:
- Botão com ícone CalendarIcon + data formatada DD/MM/YYYY ou placeholder "Selecione..."
- Popover com Calendar (`pointer-events-auto`)
- `onSelect` atualiza a parte de data no form

Cada Select de hora:
- Ícone Clock no label
- Opções de 00:00 a 23:45 (15min)
- Placeholder "Selecione..."
- `onValueChange` atualiza a parte de hora no form

**5. Auto-sugestão de 1h:**
- Quando o usuário seleciona data+hora de início e o término está vazio, auto-preencher hora término = hora início + 1h (mesma data)

**6. Validação visual:**
- Borda vermelha (`border-destructive`) nos campos com erro
- Mensagem de erro abaixo do grid quando data/hora fim < início

**7. Compatibilidade:**
- `localInputToISO` e `isoToLocalInput` continuam funcionando — o form mantém o formato `"YYYY-MM-DDTHH:MM"`
- A lógica de auto-ajuste para recorrência diária e cálculo de `estimated_minutes` não muda

### Seção técnica — helpers internos

```typescript
const timeOptions = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

function getDatePart(dt: string): Date | undefined {
  if (!dt) return undefined;
  const [datePart] = dt.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getTimePart(dt: string): string {
  if (!dt || !dt.includes("T")) return "";
  return dt.split("T")[1]?.slice(0, 5) || "";
}

function composeDt(date: Date | undefined, time: string): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T${time || "08:00"}`;
}
```

