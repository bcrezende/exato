

## Personalização do Perfil: Avatar + Tema Claro/Escuro

### 1. Avatar com Upload de Foto

**Storage**: Criar bucket `avatars` (público) com RLS para upload/delete pelo próprio usuário.

**Componente** `src/components/settings/AvatarUpload.tsx`:
- Preview circular com foto atual ou iniciais (fallback)
- Botão de upload com input file (aceita imagens até 2MB)
- Crop não será implementado agora (upload direto com resize client-side)
- Ao fazer upload: salva no bucket `avatars/{user_id}.webp`, atualiza `profiles.avatar_url`
- Botão para remover foto

**Integração no perfil** (`Settings.tsx`):
- Adicionar `AvatarUpload` no topo do card de perfil

**Sidebar** (`AppSidebar.tsx`):
- Usar `AvatarImage` do Shadcn com `profile.avatar_url` como src, mantendo fallback de iniciais

**Outros locais**: Qualquer componente que exibe avatar do usuário (rankings, equipe) passará a mostrar a foto quando disponível.

---

### 2. Tema Claro/Escuro

**Contexto** `src/contexts/ThemeContext.tsx`:
- Provider com 3 opções: `light`, `dark`, `system`
- Aplica classe `dark` no `<html>` conforme preferência
- Persiste no `localStorage` (sem necessidade de salvar no banco)

**Componente no Settings**:
- Select ou toggle group com ícones (Sol, Lua, Monitor) na aba Perfil

**Sidebar**:
- Botão pequeno de toggle tema no footer (ícone sol/lua)

**CSS** (`index.css`):
- O Tailwind já suporta `dark:` — garantir que as variáveis CSS do tema tenham variantes dark definidas

---

### Resumo de Arquivos

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar bucket `avatars` + RLS policies |
| `src/components/settings/AvatarUpload.tsx` | Novo componente de upload |
| `src/contexts/ThemeContext.tsx` | Novo contexto de tema |
| `src/pages/Settings.tsx` | Adicionar avatar upload + seletor de tema |
| `src/components/AppSidebar.tsx` | Exibir avatar image + toggle tema |
| `src/main.tsx` | Envolver app com ThemeProvider |
| `src/index.css` | Variáveis CSS dark mode |

