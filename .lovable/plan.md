

## Melhorar visibilidade das bordas e divisores

### Problema
A variável `--border` está definida com **91% de luminosidade** (light mode) e **18% de luminosidade** (dark mode) — cores extremamente próximas do fundo, tornando as linhas divisórias quase invisíveis.

### Correção

**`src/index.css`**:

1. **Light mode** (~linha 38):
   - `--border`: de `220 13% 91%` para `220 13% 82%` (mais escuro, visível)
   - `--input`: de `220 13% 91%` para `220 13% 82%` (bordas de inputs acompanham)

2. **Dark mode** (~linha 76):
   - `--border`: de `222 30% 18%` para `222 30% 28%` (mais claro, visível no escuro)
   - `--input`: de `222 30% 18%` para `222 30% 28%`

Isso afeta automaticamente todas as tabelas, cards, separadores e inputs do sistema, pois todos usam `hsl(var(--border))`.

