## Auto-calcular Tempo Estimado a partir das datas

### Abordagem

Quando o usuário preencher as datas de início e término, o campo "Tempo estimado (minutos)" será automaticamente preenchido com a diferença em minutos. O usuário NÃO pode editar manualmente o valor (override).

### Alteração

`**src/components/tasks/TaskForm.tsx**`

1. Adicionar um `useEffect` que observa `form.start_date` e `form.due_date`
2. Quando ambos estiverem preenchidos e `due_date > start_date`, calcular a diferença em minutos e atualizar `form.estimated_minutes` automaticamente
3. O campo de input continua editável para permitir override manual
4. Adicionar uma label auxiliar (ex: "Auto-calculado: 2h 30min") para indicar que o valor veio do cálculo automático

### Lógica

```typescript
useEffect(() => {
  if (form.start_date && form.due_date) {
    const diff = new Date(form.due_date).getTime() - new Date(form.start_date).getTime();
    if (diff > 0) {
      setForm(prev => ({ ...prev, estimated_minutes: String(Math.round(diff / 60000)) }));
    }
  }
}, [form.start_date, form.due_date]);
```

Nenhuma alteração de banco de dados necessária — apenas lógica de UI no formulário.