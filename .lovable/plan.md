

## Sino de notificação mais chamativo

### O que muda

Quando uma notificação nova chega (ou há não-lidas), o sino ganha animações visuais para chamar atenção:

1. **Animação de balanço (shake/ring)** no ícone do sino quando uma nova notificação chega via realtime
2. **Pulso no badge** vermelho de contagem para destacar visualmente
3. **Efeito de glow/ring** ao redor do botão quando há não-lidas

### Arquivo

| Arquivo | Mudança |
|---|---|
| `tailwind.config.ts` | Adicionar keyframe `bell-ring` (balanço lateral tipo sino) e `badge-pulse` (escala pulsante) |
| `src/components/NotificationBell.tsx` | 1) Estado `justArrived` que ativa por 3s quando nova notificação chega via realtime. 2) Classe `animate-bell-ring` no ícone Bell durante `justArrived`. 3) Classe `animate-badge-pulse` permanente no badge de contagem. 4) Ring/glow sutil no botão quando `unreadCount > 0`. |

### Visual esperado

- Sino balança por ~3 segundos quando notificação nova chega
- Badge vermelho pulsa continuamente enquanto há não-lidas
- Botão tem um leve brilho/anel colorido quando há não-lidas

