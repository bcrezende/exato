

## Reestruturar Team.tsx

### Alterações em `src/pages/Team.tsx`

**1. Header Compacto**
- Título: `"Equipe"` (remover `"& Setores"` e parágrafo descritivo)
- Botões mantidos à direita como estão

**2. Tabs Minimalistas**
- Remover ícones (`Users`, `Building`, `Send`, `Link2`) dos `TabsTrigger`, deixar apenas texto
- Renomear "Convites Pendentes" → "Convites"

**3. Aba Membros — Busca + Filtros**
- Adicionar estados: `searchMembers`, `filterDept`, `filterRole`
- Acima da tabela: barra com `Input` de busca + 2 `Select` (Setor, Papel)
- Filtrar `members` por nome (busca), `department_id` e role antes de renderizar
- Remover coluna "Cargo" (`position`) da tabela

**4. Aba Setores — Grid Compacto**
- Avatares empilhados: limitar de 5 para 3
- Remover botão de deletar do card (manter apenas editar no canto superior direito)
- Remover `CardDescription`, colocar contador inline no título

**5. Correções Técnicas**
- Limpar imports não utilizados (`Plus`, `CardDescription` se removido, `Users`, `Building`, `Send`, `Link2` dos tabs)
- Loading já existe via `TeamSkeleton` — sem mudança necessária

