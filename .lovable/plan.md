

## Limitar criação de convites por papel

### Regras
| Quem convida | Pode convidar | Setor |
|---|---|---|
| Admin | Admin, Gerente, Coordenador, Analista | Qualquer setor (opcional para admin) |
| Gerente | Coordenador, Analista | Herda o próprio setor automaticamente |
| Coordenador | Analista | Herda o próprio setor automaticamente |
| Analista | Ninguém | Botão "Convidar" oculto |

### Alterações em `src/pages/Team.tsx`

**1. Ocultar botão "Convidar" para analistas** (linha 156)
- Mostrar apenas se `role !== "analyst"`

**2. Opções de papel no modal** (linhas 366-371)
- Admin: todas as opções (admin, manager, coordinator, analyst)
- Gerente: coordinator e analyst apenas (já está assim)
- Coordenador: apenas analyst — remover a opção `coordinator` que hoje aparece para qualquer role

**3. Setor automático para coordenadores** (linhas 374-386)
- Coordenador herda o setor do próprio perfil assim como o gerente
- Ocultar o campo de setor para coordenadores (mesma lógica do manager)
- Atualizar a lógica de `departmentId` na função `sendInvite` (linha 111) para incluir coordenador

**4. Validação no `sendInvite`** (linha 111)
- `role === "coordinator"` também herda `currentProfile.department_id`

### Arquivo afetado
- `src/pages/Team.tsx`

