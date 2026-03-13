

## Corrigir animações que não estão visíveis

### Diagnóstico

Analisei o replay da sessão e o código. As classes CSS **estão sendo aplicadas** corretamente, mas as animações são sutis demais para serem percebidas:

1. **highlight-success**: fundo verde com apenas 20% de opacidade — quase invisível em card branco
2. **pulse-success**: box-shadow verde muito leve, desaparece rápido
3. **stagger-fade-in**: delays de 50ms entre itens — parece tudo ao mesmo tempo
4. **hover-lift**: sobe apenas 4px — quase imperceptível
5. **hover-scale-subtle**: escala de 1.02 — praticamente nula

### Correções

**`tailwind.config.ts`**:
- `highlight-success`: aumentar opacidade para 0.35 e adicionar etapa intermediária (0% → 50% → 100%) para flash mais visível
- `pulse-success`: aumentar raio do box-shadow de 10px para 16px e opacidade de 0.4 para 0.6
- `highlight-flash`: aumentar opacidade de 0.15 para 0.3
- Aumentar duração: highlight-success de 1s para 1.5s, pulse-success de 0.6s para 1s

**`src/index.css`**:
- `stagger-fade-in`: aumentar delays entre itens (0, 100ms, 200ms, 300ms... em vez de 50ms)
- `hover-lift`: aumentar para `-translate-y-1.5` e `shadow-lg`
- `hover-scale-subtle`: aumentar escala para `1.05`

**`src/components/dashboard/MyDayView.tsx`**:
- Adicionar borda verde temporária no card ao concluir (via classe condicional `border-success/50`)
- Aumentar duração do estado `successId` de 1000ms para 1500ms

### Arquivos alterados
- `tailwind.config.ts` — intensificar keyframes e durações
- `src/index.css` — aumentar delays do stagger e efeitos de hover
- `src/components/dashboard/MyDayView.tsx` — borda de sucesso + timeout maior

