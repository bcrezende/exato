

## Adicionar animações ao sistema

Existem vários pontos onde animações podem melhorar a experiência. Aqui estão os exemplos concretos, organizados por categoria:

### 1. Transições de status (Iniciar / Concluir)
- **Confetti ou pulse verde** ao concluir uma tarefa — feedback visual de conquista
- **Linha da tabela pisca suavemente** (highlight flash) ao mudar status
- **Badge de status anima** com scale-in ao trocar (ex: de "Pendente" → "Em Andamento")

### 2. Cards e linhas da tabela
- **Fade-in escalonado** — cada linha/card aparece com delay progressivo ao carregar a lista
- **Slide-out** ao concluir/excluir — a linha desliza para fora antes de desaparecer
- **Hover lift** — cards sobem levemente com sombra ao passar o mouse

### 3. Navegação e páginas
- **Fade-in nas páginas** ao trocar de rota (Dashboard → Tarefas → Equipe)
- **Sidebar items** com hover scale sutil

### 4. Modais e formulários
- **Scale-in** ao abrir modais (já parcialmente suportado pelo Radix)
- **Shake** no formulário quando há erro de validação
- **Botão de submit** com loading spinner animado

### 5. Dashboard / Meu Dia
- **Contadores animados** — números sobem de 0 ao valor real (count-up)
- **Progress bars** com animação de preenchimento
- **Cards de estatística** com fade-in escalonado

### 6. Toast/notificações
- **Slide-in suave** (já funciona via Sonner, mas pode ser customizado)
- **Ícone de sucesso** com animação de checkmark desenhando

---

### Implementação técnica

**Arquivos alterados:**

1. **`tailwind.config.ts`** — Adicionar keyframes: `fade-in`, `fade-out`, `scale-in`, `slide-up`, `slide-out-left`, `highlight-flash`, `shake`, `count-up`

2. **`src/index.css`** — Adicionar classes utilitárias: `.hover-lift`, `.stagger-fade-in`, `.highlight-flash`

3. **`src/pages/Tasks.tsx`** — Adicionar animação de highlight na linha ao mudar status; fade-in escalonado nas linhas da tabela

4. **`src/components/dashboard/MyDayView.tsx`** — Fade-in escalonado nos cards de estatística e lista de tarefas; animação ao mudar status

5. **`src/components/AppLayout.tsx`** — Fade-in na troca de página (wrapper com `animate-fade-in` no conteúdo)

6. **`src/components/AppSidebar.tsx`** — Hover scale sutil nos itens do menu

As animações serão leves (200-300ms), respeitando `prefers-reduced-motion`, e usando CSS/Tailwind puro (sem biblioteca extra).

