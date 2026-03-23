

## Separar fluxo do modal "Não Feita" por tipo de tarefa

### O que muda

O modal terá dois fluxos distintos:

**Tarefa SEM recorrência:**
- Pergunta: "Quando deseja alterar o prazo final da tarefa?"
- Mostra calendário para selecionar nova data
- Botão "Apenas marcar como não feita" como alternativa
- Sem RadioGroup — fluxo simplificado com calendário direto + link/botão secundário para "apenas marcar"

**Tarefa COM recorrência:**
- Ação direta: "Gerar próxima ocorrência"
- Sem opções extras, sem calendário
- Confirmar gera a próxima ocorrência automaticamente

### Arquivo

| Arquivo | Mudança |
|---|---|
| `src/components/tasks/NotDoneActionModal.tsx` | Bifurcar o conteúdo do modal com `isRecurring`: recorrente mostra apenas texto + confirmar (gera próxima); não-recorrente mostra calendário para nova data + opção de apenas marcar |

### UI proposta

**Sem recorrência:**
```
Tarefa Não Feita
─────────────────
[título da tarefa]
📅 Vencimento: 22/03/2026

Quando deseja alterar o prazo final da tarefa?
[📅 Selecionar nova data ▾]

ou

☐ Apenas marcar como não feita

[Cancelar] [Confirmar]
```

**Com recorrência:**
```
Tarefa Não Feita
─────────────────
[título da tarefa]
📅 Vencimento: 22/03/2026

Esta tarefa será marcada como não feita e a próxima
ocorrência será gerada automaticamente.

💬 Motivo (opcional)
[___________________]

[Cancelar] [Confirmar]
```

