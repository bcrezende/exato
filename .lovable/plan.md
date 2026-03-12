

## Plano: Dashboard de Monitoramento Gerencial

### Problema
O dashboard atual carrega todas as tarefas sem separação temporal, misturando dias e dificultando o monitoramento humano. Um gestor precisa ver rapidamente: o que está atrasado, o que precisa de atenção hoje, e o progresso geral.

### Proposta: Layout em seções temporais + resumo visual

Reorganizar o dashboard em **seções claras por urgência**, pensando no fluxo mental de um gestor ao abrir a tela:

```text
┌─────────────────────────────────────────────────┐
│  Stats Cards (Hoje: X pendentes, Y andamento,   │
│  Z concluídas, W atrasadas)                     │
├─────────────────────────────────────────────────┤
│  🔴 ATENÇÃO: Tarefas Atrasadas (com dias de    │
│     atraso, responsável, prioridade)            │
├─────────────────────────────────────────────────┤
│  📋 HOJE: Tarefas do Dia                       │
│     Separadas por status (pendente/andamento/   │
│     concluída) com barra de progresso           │
├─────────────────────────────────────────────────┤
│  📅 PRÓXIMOS DIAS (amanhã + 2 dias)            │
│     Preview do que vem pela frente              │
├─────────────────────────────────────────────────┤
│  Toggle: Kanban completo | Calendário           │
└─────────────────────────────────────────────────┘
```

### Alterações

**`src/pages/Dashboard.tsx`** — Reescrever o `AdminManagerDashboard`:

1. **Stats cards** passam a mostrar apenas dados de **hoje** (não totais históricos), com destaque para atrasadas
2. **Seção "Atenção Imediata"** — Lista tarefas com `status = overdue` ou `due_date < hoje && status != completed`, mostrando:
   - Título, responsável (nome do perfil), dias de atraso, prioridade
   - Ordenadas por prioridade (alta primeiro) e dias de atraso
3. **Seção "Hoje"** — Tarefas com `due_date` ou `start_date` de hoje:
   - Barra de progresso (concluídas / total do dia)
   - Cards agrupados por status
   - Nome do responsável em cada card
4. **Seção "Próximos Dias"** — Próximos 3 dias, resumo compacto com contagem por dia
5. **Kanban e Calendário** mantidos como views alternativas via toggle, mas filtrados por padrão na semana atual

**Buscar perfis** — Fazer join com `profiles` para mostrar nome do responsável:
```typescript
.select("*, profiles!tasks_assigned_to_fkey(full_name)")
```
Como não há FK formal, buscar perfis separadamente e mapear por ID.

### Detalhes técnicos
- Fetch de tasks + profiles em paralelo
- Cálculo de "dias de atraso" = diferença entre hoje e `due_date`
- Barra de progresso do dia = `(concluídas_hoje / total_hoje) * 100`
- Seção de atrasadas com destaque visual vermelho e ícone de alerta
- Responsivo: seções empilham em mobile

