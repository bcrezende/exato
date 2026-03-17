

## Configurar emails de autenticação com domínio próprio

### Problema
Os emails de autenticação (recuperação de senha, verificação, etc.) estão sendo enviados pelo endereço padrão `no-reply@auth.lovable.cloud` em vez do domínio personalizado `notify.rezendetech.com.br`. Isso acontece porque os templates de email de autenticação ainda não foram configurados — apenas a infraestrutura de fila foi criada.

### Solução

1. **Criar templates de email de autenticação** usando a ferramenta de scaffolding, que gera:
   - Edge Function `auth-email-hook` (intercepta emails de auth e envia pelo domínio próprio)
   - 6 templates: signup, magic-link, recovery, invite, email-change, reauthentication

2. **Aplicar identidade visual do app** nos templates:
   - Cor primária: `hsl(221, 83%, 53%)` (azul)
   - Cor de texto: `hsl(222, 47%, 11%)` (escuro)
   - Cor secundária: `hsl(220, 9%, 46%)`
   - Border radius: `0.75rem`
   - Fonte: Inter
   - Logo: `src/assets/logo-dark.png` (upload para storage bucket)
   - Idioma: Português brasileiro (todo o app usa PT-BR)

3. **Deploy** da Edge Function `auth-email-hook`

Após isso, os emails passarão a ser enviados de `notify.rezendetech.com.br` com a identidade visual do Exato.

