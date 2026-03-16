

## Mover "Análise IA" para o menu lateral (grupo Gestão)

### Abordagem

A Análise IA atualmente é um botão no header do Dashboard que abre um Dialog. Para movê-la para o sidebar, a melhor abordagem é criar uma **rota dedicada `/analysis`** que renderiza a página de análise, e adicionar o link no menu lateral.

### Alterações

**1. `src/pages/Analysis.tsx`** — Nova página
- Mover a lógica do `AIAnalysisDialog` para uma página standalone (sem dialog, conteúdo direto na página)
- Buscar departments e profiles internamente (como o Dashboard já faz)
- Manter os mesmos filtros e resultado com markdown

**2. `src/components/AppSidebar.tsx`**
- Importar `BrainCircuit` do lucide-react
- Adicionar `{ title: "Análise IA", url: "/analysis", icon: BrainCircuit }` ao array `managementItems` (já protegido por `role === "admin" || role === "manager"`)

**3. `src/App.tsx`**
- Adicionar rota `/analysis` protegida com `allowedRoles={["admin", "manager"]}` (mesmo padrão da rota `/team`)

**4. `src/pages/Dashboard.tsx`**
- Remover o botão "Análise IA" do header e o import do `AIAnalysisDialog`

