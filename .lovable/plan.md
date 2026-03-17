

## Adicionar Interface de Vínculos Coordenador → Analista

### Onde ficará no site

Na página **Equipe & Setores** (`/team`), será adicionada uma **nova aba "Vínculos"** nas tabs existentes (ao lado de Membros, Setores e Convites Pendentes). Visível apenas para **Admin** e **Gerente**.

### Como vai funcionar

1. A aba mostra uma lista de coordenadores com os analistas vinculados a cada um
2. Botão "Vincular Analista" abre um modal com dois selects: escolher Coordenador e escolher Analista
3. Botão de remover vínculo (ícone lixeira) em cada analista vinculado
4. Filtra coordenadores e analistas com base nos `user_roles` existentes

### Alterações

**`src/pages/Team.tsx`**
- Adicionar nova aba "Vínculos" (`TabsTrigger` + `TabsContent`)
- Buscar dados de `coordinator_analysts` no `fetchData`
- Adicionar estado para modal de vínculo e dados dos vínculos
- Funções para criar e remover vínculos (`coordinator_analysts` INSERT/DELETE)
- Exibir cards por coordenador, cada um listando seus analistas com botão de remover
- Modal com Select de Coordenador (filtrado por role=coordinator) e Select de Analista (filtrado por role=analyst)

### Layout da aba

Cada coordenador aparece como um Card com:
- Nome do coordenador no header
- Lista dos analistas vinculados com botão de remover
- Se não há analistas, mostra "Nenhum analista vinculado"

Botão "Novo Vínculo" no topo da aba para abrir o modal.

Nenhuma alteração de banco necessária — a tabela e as RLS policies já existem.
