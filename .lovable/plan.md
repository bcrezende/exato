

## Reestruturar Settings.tsx

### Alterações em `src/pages/Settings.tsx`

**1. Header Minimalista**
- Remover `tracking-tight` e parágrafo descritivo
- Manter apenas `<h1 className="text-3xl font-bold">Configurações</h1>`

**2. Tabs Icon-Only com Tooltips**
- Importar `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` de `@/components/ui/tooltip`
- Importar `Save` de lucide-react
- Remover texto dos `TabsTrigger`, manter apenas ícones
- Envolver cada trigger em `Tooltip` + `TooltipTrigger`/`TooltipContent` com labels: Perfil, Empresa, Recorrências, Feriados
- Aumentar container para `max-w-4xl`

**3. Cards Limpos**
- Remover todas as `CardDescription`
- Remover import de `CardDescription`
- Adicionar ícone `Save` nos botões de salvar: `<Save className="mr-2 h-4 w-4" />`

**4. isDirty Detection**
- Adicionar estado `initialProfileForm` (ref ou state) setado no `useEffect` quando `profile` carrega
- Computar `isProfileDirty` comparando `profileForm` com `initialProfileForm`
- Adicionar `initialCompanyName` e `initialCompanyTimezone` da mesma forma
- Computar `isCompanyDirty`
- Mostrar `<Badge>Alterações não salvas</Badge>` ao lado do título do card quando dirty
- Desabilitar botão salvar quando `!isDirty`
- Resetar initial values após salvar com sucesso

**5. Layout 2 Colunas no Perfil**
- Nome + Telefone em `grid grid-cols-2 gap-4`
- Cargo em linha própria abaixo
- Adicionar `<Separator />` entre grupo de campos e botão salvar

**6. Empresa — Layout**
- Nome + Fuso em `grid grid-cols-2 gap-4`
- `<Separator />` antes do botão salvar

### Arquivo afetado
- `src/pages/Settings.tsx`

