

## Importar Feriados Nacionais do Brasil

### Abordagem

Usar a **BrasilAPI** (gratuita, sem autenticação): `https://brasilapi.com.br/api/feriados/v1/{ano}` — retorna JSON com feriados nacionais do ano.

### Implementação

**Arquivo:** `src/components/settings/HolidaySettings.tsx`

1. Adicionar botão "Importar Feriados BR" ao lado do "Novo Feriado"
2. Ao clicar, abrir dialog com:
   - Select de ano (ano atual e próximo)
   - Preview dos feriados que serão importados (vindos da BrasilAPI)
   - Indicação de quais já existem no banco (para evitar duplicatas)
   - Botão "Importar Selecionados"
3. Fazer `fetch` direto do client para `https://brasilapi.com.br/api/feriados/v1/{ano}`
4. Comparar com feriados já cadastrados (por data) e marcar duplicatas
5. Inserir os selecionados na tabela `company_holidays` com `is_recurring: true` para feriados fixos (Natal, Ano Novo, etc.) e `is_recurring: false` para feriados móveis (Carnaval, Páscoa, Corpus Christi)

### Detalhes técnicos

- A BrasilAPI retorna: `[{ date: "2026-01-01", name: "Confraternização mundial", type: "national" }]`
- Feriados móveis (baseados na Páscoa): Carnaval, Sexta-feira Santa, Corpus Christi — serão marcados como `is_recurring: false`
- Feriados fixos (mesma data todo ano): todos os demais — marcados como `is_recurring: true`
- Nenhuma dependência nova necessária — usa `fetch` nativo
- Nenhuma alteração no banco de dados

