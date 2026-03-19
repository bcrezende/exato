

## Apresentação HTML da Plataforma Exato

### O que será criado
Uma página HTML standalone (single-file) com apresentação profissional em slides, estilo pitch deck, para apresentar a plataforma Exato a empresas. A página será adicionada ao projeto como `src/pages/Presentation.tsx` com rota `/presentation`.

### Estrutura dos Slides (10 slides)

1. **Capa** — Logo Exato, tagline "Gestão de tarefas inteligente para equipes que entregam resultados"
2. **O Problema** — Falta de visibilidade, atrasos não rastreados, gestão manual
3. **A Solução** — Plataforma Exato com visão geral das funcionalidades
4. **Dashboards por Papel** — Admin, Gerente, Coordenador, Analista — cada um vê o que precisa
5. **Gestão de Tarefas** — Kanban, Lista, Calendário, importação em massa, recorrência
6. **Monitoramento de Equipe** — Ranking, status de atividade, detalhamento por analista
7. **Análise com IA** — Insights automáticos, histórico de análises, recomendações
8. **Segurança** — RLS por papel, logging seguro, dados isolados por empresa
9. **Diferenciais** — Tooltips de fórmulas, notificações, convites, feriados, temas dark/light
10. **CTA / Contato** — Call to action final

### Abordagem técnica

- **Componente React** com navegação por teclado (setas) e clique
- **Fullscreen** via botão
- **Design**: Paleta da plataforma (primary azul `hsl(221,83%,53%)`, fundo escuro `hsl(222,47%,11%)`, branco)
- **Fontes**: Space Grotesk (títulos) + Inter (corpo) — já importadas no projeto
- **Animações**: Fade-in nos elementos ao trocar slide
- **Responsivo**: Escala proporcional para qualquer tela
- **Barra de progresso** no rodapé
- **Thumbnails** lateral opcional

### Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/Presentation.tsx` |
| Editar | `src/App.tsx` (adicionar rota `/presentation` pública) |

### Detalhes visuais por slide

- Slides ímpares: fundo escuro com texto claro (premium feel)
- Slides pares: fundo claro com cards e ícones coloridos
- Ícones Lucide para cada funcionalidade
- Grid cards para features (2x2 ou 3x2)
- Números grandes (48-72px) para estatísticas de impacto

