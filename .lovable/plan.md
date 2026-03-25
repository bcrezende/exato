

## Dividir card "Atrasadas" por setor no AdminDashboard

### O que será feito

O card "Atrasadas Hoje/Ontem/Período" no `AdminKpiCards` passará a exibir, além do total, uma lista compacta mostrando a quantidade de tarefas atrasadas por setor (departamento). O card terá o número total em destaque e abaixo uma mini-lista com o nome do setor e a contagem.

### Mudanças

**1. `src/pages/Dashboard/AdminDashboard.tsx`**
- Calcular um objeto `overdueByDepartment` (array de `{ name: string, count: number }`) agrupando `overdueTasks` por `department_id` e mapeando para o nome do departamento
- Passar esse array como nova prop `overdueByDepartment` ao `AdminKpiCards`

**2. `src/components/dashboard/admin/AdminKpiCards.tsx`**
- Adicionar prop `overdueByDepartment: { name: string; count: number }[]`
- Substituir o card "Atrasadas" por um card especial que mostra:
  - O total de atrasadas em destaque (texto grande)
  - Abaixo, uma mini-lista scrollável (max 3-4 itens visíveis) com cada setor e sua contagem, usando badges ou texto compacto
  - Setores ordenados por quantidade de atrasos (maior primeiro)

### Visual proposto

```text
┌─────────────────────┐
│ ⚠  17               │
│ Atrasadas Hoje      │
│ ─────────────────── │
│ Financeiro      8   │
│ Comercial       5   │
│ RH              4   │
└─────────────────────┘
```

### Detalhes técnicos

**AdminDashboard — cálculo:**
```typescript
const overdueByDepartment = useMemo(() => {
  const map = new Map<string, number>();
  overdueTasks.forEach(t => {
    const deptName = departments.find(d => d.id === t.department_id)?.name || "Sem setor";
    map.set(deptName, (map.get(deptName) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}, [overdueTasks, departments]);
```

**AdminKpiCards — card especial para atrasadas:**
- Os 3 primeiros cards continuam iguais (Setores Ativos, Total de Tarefas, % Atraso Médio)
- O card "Atrasadas" renderiza com layout expandido: ícone + total no topo, separador, lista de setores abaixo com `max-h-[80px] overflow-y-auto` e texto `text-xs`
- Cada linha do setor: nome truncado à esquerda, contagem à direita com badge pequeno

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard/AdminDashboard.tsx` | Calcular e passar `overdueByDepartment` |
| `src/components/dashboard/admin/AdminKpiCards.tsx` | Receber prop e renderizar breakdown por setor no card |

