

## Adicionar cor de fundo ao botao selecionado no AdminPeriodToggle

Atualmente os botoes selecionados usam `data-[state=on]:bg-background data-[state=on]:shadow-sm`, que e branco/neutro. A mudanca sera adicionar uma cor primaria de fundo quando selecionado.

### Arquivo a editar

`src/components/dashboard/admin/AdminPeriodToggle.tsx`

### Mudanca

Trocar as classes `data-[state=on]:bg-background data-[state=on]:shadow-sm` por `data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm` em cada `ToggleGroupItem`, para que o botao ativo tenha fundo na cor primaria do tema com texto contrastante.

