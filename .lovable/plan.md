

## Substituir "Próximos Dias" por Pódio de Gamificação

### Conceito

Criar um **Ranking Pódio** dos analistas baseado em uma **pontuação de produtividade** calculada a partir de dados reais já disponíveis no sistema. A pontuação combina múltiplos fatores:

| Critério | Pontos | Justificativa |
|---|---|---|
| Tarefa concluída | +10 pts | Incentiva conclusão |
| Concluída no prazo (sem atraso) | +5 pts bônus | Premia pontualidade |
| Concluída com atraso | -3 pts | Penaliza atraso |
| Prioridade alta concluída | +3 pts bônus | Valoriza tarefas difíceis |

Todos os dados necessários já existem: `tasks` (status, priority, assigned_to, due_date), `task_time_logs` (started, started_late, completed).

### Visual

O card terá:
- **Top 3 em pódio visual**: medalhas de ouro/prata/bronze com avatar, nome e pontuação
- Posições 2º, 1º, 3º dispostas como um pódio real (centro mais alto)
- Abaixo, uma **lista compacta** com as posições 4º em diante
- Card clicável que abre um **Dialog** com o ranking completo e breakdown de pontos por analista
- Filtro de período: últimos 7 dias (padrão), 30 dias, todo o período

### Alterações

**`src/pages/Dashboard.tsx`:**
- Remover o bloco "Próximos Dias" (linhas 345-382) e o cálculo `upcomingDays` do `useMemo`
- Substituir pelo componente `<PodiumCard />`
- Passar props: `tasks`, `timeLogs`, `profiles`, `selectedDepartment`, `departments`

**Novo componente `src/components/dashboard/PodiumCard.tsx`:**
- `useMemo` para calcular pontuação por analista cruzando tasks + timeLogs
- Estado para período selecionado e dialog de detalhes
- Visual do pódio com ícones Trophy/Medal (lucide-react)
- Dialog com tabela: Posição, Analista, Setor, Tarefas Concluídas, No Prazo, Atrasadas, Pontuação Total
- Respeita filtro de departamento já existente

Nenhuma alteração de banco necessária — todos os dados já estão disponíveis.

