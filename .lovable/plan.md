## Adicionar botão "Meu Dia" no Dashboard do Admin e Gerente

### Abordagem

Adicionar uma nova rota `/my-day` que renderiza o componente `MyDayView` já existente, e colocar um botão no header do dashboard admin/manager que leva a essa rota.

### Alterações

**1. `src/App.tsx**` — Adicionar rota `/my-day` dentro das rotas protegidas:

```tsx
<Route path="/my-day" element={<MyDayView />} />
```

Importar `MyDayView` no topo.

**2. `src/pages/Dashboard.tsx**` — Adicionar botão "Meu Dia" no header do `AdminManagerDashboard`, ao lado dos filtros:

```tsx
<Button variant="outline" onClick={() => navigate("/my-day")} className="gap-2">
  <CalendarIcon className="h-4 w-4" />
  Meu Dia
</Button>
```

Importar `useNavigate` do react-router-dom.

### Arquivos alterados

- `src/App.tsx` — nova rota `/my-day`
- `src/pages/Dashboard.tsx` — botão no header + import useNavigate