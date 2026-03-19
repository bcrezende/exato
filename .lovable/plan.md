

## Usar logo reduzida no sidebar colapsado

### Problema
Quando o sidebar é colapsado, a logo completa (`logo-white.png`) fica achatada e ilegível.

### Solução
Copiar a imagem enviada como `src/assets/logo-icon.png` e exibi-la no lugar da logo completa quando o sidebar estiver colapsado.

### Arquivo a editar
`src/components/AppSidebar.tsx`

### Mudanças

1. Copiar `user-uploads://Editedimage_1773942516854_copia.png` → `src/assets/logo-icon.png`

2. Importar a nova logo:
```typescript
import logoIcon from "@/assets/logo-icon.png";
```

3. Trocar a tag `<img>` no `SidebarHeader` (linha 50):
```typescript
<img
  src={collapsed ? logoIcon : logoWhite}
  alt="Exato"
  className={collapsed ? "h-8 w-8 object-contain" : "h-14 w-auto"}
/>
```

Quando expandido: logo completa branca. Quando colapsado: ícone compacto.

