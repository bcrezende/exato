

## Adicionar animação suave na troca de logo do sidebar

### Problema
A troca entre `logo-white.png` e `logo-icon.png` ao colapsar/expandir o sidebar é abrupta e pouco profissional.

### Solução
Mostrar **ambas as logos simultaneamente** com posicionamento absoluto, controlando a visibilidade via `opacity` e `transition`. Quando colapsado, a logo completa faz fade-out e o ícone faz fade-in (e vice-versa). Isso cria uma transição suave sem flicker.

### Arquivo a editar
`src/components/AppSidebar.tsx` — linhas 49-52

### Mudança

Substituir a `<div>` com a imagem única por um container relativo com ambas as logos sobrepostas:

```tsx
<SidebarHeader className="p-4">
  <div className="relative flex items-center justify-start">
    <img
      src={logoWhite}
      alt="Exato"
      className={`h-14 w-auto transition-opacity duration-300 ease-in-out ${
        collapsed ? "opacity-0 absolute" : "opacity-100"
      }`}
    />
    <img
      src={logoIcon}
      alt="Exato"
      className={`h-8 w-8 object-contain transition-opacity duration-300 ease-in-out ${
        collapsed ? "opacity-100" : "opacity-0 absolute"
      }`}
    />
  </div>
</SidebarHeader>
```

A logo visível ocupa o fluxo normal; a invisível fica `absolute` para não afetar o layout. A transição de `opacity` em 300ms dá um fade suave e profissional.

