

## Aplicar logo do Exato no projeto

### Onde usar cada imagem

| Local | Imagem | Motivo |
|-------|--------|--------|
| **Sidebar** (header) | `Editedimage_1773421174317-removebg-preview.png` (logo branca, fundo transparente) | Sidebar tem fundo escuro |
| **Login, Register, AcceptInvite** | `Generatedimage_1773421039877-removebg-preview.png` (logo escura, fundo transparente) | Páginas com fundo claro |
| **Favicon** | `Generatedimage_1773421039877.png` (logo escura, fundo branco) | Ícone da aba do navegador |

**Nota:** Os ícones `Building2` usados como ícone de "setor/departamento" em Tasks, Dashboard e TaskDetailModal permanecem inalterados -- ali representam setores, não a marca.

### Alterações

1. **Copiar arquivos**:
   - Logo branca → `src/assets/logo-white.png`
   - Logo escura transparente → `src/assets/logo-dark.png`
   - Logo para favicon → `public/favicon.png`

2. **`src/components/AppSidebar.tsx`**: Substituir o `<Building2>` no header por `<img src={logoWhite}>` com tamanho adequado (~h-8)

3. **`src/pages/Login.tsx`**, **`src/pages/Register.tsx`**, **`src/pages/AcceptInvite.tsx`**: Substituir o div com `<Building2>` por `<img src={logoDark}>` (~h-12), remover o `<h1>Exato</h1>` (já está na logo)

4. **`index.html`**: Atualizar favicon para `/favicon.png`

