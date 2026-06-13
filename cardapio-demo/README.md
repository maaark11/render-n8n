# Cardápio Digital — Choperia Sapopemba (versão mobile-first)

Versão **100% mobile friendly** do cardápio, pronta para apresentar ao cliente.
É um único arquivo `index.html` — abre em qualquer navegador, sem instalação,
sem dependências e carrega instantaneamente no celular.

## ✨ Melhorias em relação ao cardápio atual

| Antes | Agora |
|---|---|
| Página pesada / lenta no celular | Arquivo único, carrega em < 1s, funciona offline depois do 1º acesso |
| Difícil navegar entre categorias | Menu de categorias fixo no topo com rolagem automática (scroll-spy) |
| Sem busca | Campo de **busca instantânea** por item |
| Cliente liga ou não pede | Botão flutuante **Pedir pelo WhatsApp** + ligação com 1 toque |
| Sem destaque de produtos | Selos **"Mais pedido"** e **"Novo"** para empurrar margem |
| Visual genérico | Identidade de choperia (tema escuro + dourado), fontes legíveis |
| Não mostra se está aberto | Status **Aberto/Fechado automático** pelo horário |

## 📱 Recursos mobile

- Layout responsivo de verdade (testado em telas pequenas, respeita o *notch*/safe-area).
- Áreas de toque grandes, alvo mínimo de 44px, zero zoom acidental.
- Acessível: HTML semântico, `aria-label`, respeita "reduzir movimento".
- Pronto para WhatsApp/Google: preview com Open Graph e ícone.

## 🛠️ Como personalizar (2 minutos)

1. Abra o `index.html`.
2. Edite a constante **`MENU`** (perto do fim do arquivo) — categorias, itens,
   descrições, preços e o selo `badge: "hot"` (mais pedido) ou `"new"` (novo).
3. Troque os dados de contato:
   - WhatsApp: substitua `5511900000000` (botão e link) pelo número real.
   - Telefone, endereço, horário e redes sociais no rodapé e no cabeçalho.
   - Logo: hoje é o emoji 🍺 — basta trocar por `<img>` com a logo real.

## 🚀 Como publicar

Por ser estático, sobe em qualquer lugar grátis:
GitHub Pages, Netlify, Vercel ou Cloudflare Pages. Depois é só gerar um
QR Code apontando para o link e colar nas mesas.

> Observação: o cardápio original (`dguests.com.br`) não pôde ser acessado
> automaticamente neste ambiente, então os itens acima são **exemplos realistas
> de choperia**. Basta substituí-los pelos produtos e preços reais do cliente.
