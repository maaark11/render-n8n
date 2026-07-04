# Kalo Local — TikTok Shop Analytics (Demo)

Uma reconstrução **local, original e offline** do *conceito* do
[kalodata.com](https://www.kalodata.com/) — uma plataforma de analytics de
TikTok Shop. Serve para estudar a arquitetura desse tipo de produto e para
experimentar na sua máquina, **sem depender de nada externo**.

> ⚠️ **O que isto NÃO é.** Não é o Kalodata, não usa o código nem os dados
> proprietários deles, não faz scraping do site e não acessa a API do TikTok.
> Todos os números são **sintéticos**, gerados localmente a partir de uma
> seed fixa (`lib/data.js`). É um clone conceitual para fins educativos.

---

## Como rodar (roda 100% local, sem `npm install`)

Só precisa do **Node.js 16+**. O projeto tem **zero dependências** — usa
apenas os módulos nativos do Node.

```bash
cd kalodata-local
node server.js
```

Depois abra **http://127.0.0.1:4173** no navegador.

No login, clique em **"Use demo account"** (ou digite qualquer e-mail e senha —
é um sandbox local, não há autenticação real).

Para mudar a porta: `PORT=8080 node server.js`.

---

## O que o Kalodata faz (e que este demo reproduz)

O Kalodata é uma SaaS de analytics para TikTok Shop. Com base em pesquisa
pública, os módulos centrais são:

| Módulo | Para que serve | Métricas típicas |
|---|---|---|
| **Products** | Achar produtos vencedores / em alta | Revenue, GMV, unidades, preço, comissão, crescimento |
| **Creators** | Encontrar influenciadores por nicho/performance | Followers, revenue gerado, engajamento, GPM |
| **Videos** | Inspiração de conteúdo viral | Views, revenue, likes, engajamento, GPM |
| **Livestreams** | Analisar lives de venda | Revenue, espectadores, itens vendidos, duração |
| **Shops** | Benchmark de concorrentes | Revenue, nº de produtos, seguidores, rating |

Filtros comuns: **categoria**, **região/país** e **janela de tempo**.
Este demo implementa Overview + os 5 módulos, com filtros de categoria/região,
busca, ordenação por coluna, paginação e drill-down com gráfico de tendência
de 30 dias por item.

---

## Arquitetura

```
kalodata-local/
├── server.js          # Servidor HTTP (módulo `http` nativo) — API + estáticos
├── lib/
│   └── data.js        # Motor de dados sintéticos (PRNG com seed fixa)
├── public/
│   ├── index.html     # Shell da SPA (login + app + drawer)
│   ├── styles.css     # Tema dark, layout, tabelas, gráficos
│   └── app.js         # SPA em JS puro: router, tabelas, filtros, charts SVG
└── package.json       # Sem dependências; `node server.js`
```

**Como uma plataforma real (ex.: Kalodata) se compara a este demo:**

| Camada | Plataforma real | Este demo |
|---|---|---|
| Ingestão de dados | Coleta/parceria com dados de TikTok Shop, pipelines de ETL | Gerador sintético determinístico em memória |
| Armazenamento | Data warehouse + índices (ex.: ClickHouse/BigQuery) | Arrays em memória, calculados no boot |
| API | Serviço com auth real, rate limiting, billing | REST com token "demo", sem persistência |
| Frontend | SPA (React/Vue) com charts (ECharts/D3) | SPA em JS puro + gráficos SVG feitos à mão |
| Auth/Billing | Contas, planos, cobrança | Login fake (qualquer e-mail entra) |

### API (todos exigem `Authorization: Bearer <token>`, exceto login/meta)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/login` | Retorna um token de demo |
| `GET` | `/api/meta` | Lista de categorias e regiões |
| `GET` | `/api/overview` | KPIs, tendência de receita, top categorias/produtos |
| `GET` | `/api/:collection` | Lista com `?category=&region=&search=&sort=&order=&page=&pageSize=` |
| `GET` | `/api/:collection/:id` | Detalhe de um item (inclui `trend` de 30 dias) |

`:collection` ∈ `products`, `creators`, `videos`, `livestreams`, `shops`.

### Dados sintéticos

`lib/data.js` gera, no boot, um dataset estável (seed `20240704`):
500 produtos, 300 criadores, 600 vídeos, 160 lives e 120 lojas, cada um com
uma série temporal de 30 dias. Como a seed é fixa, os números são **idênticos
em toda execução e em toda máquina**. Para variar o dataset, mude `SEED` em
`lib/data.js`.

---

## Ajustes rápidos

- **Mais/menos dados:** edite as chamadas `genProducts(500, ...)` etc. no fim de `lib/data.js`.
- **Novas categorias/regiões:** arrays `CATEGORIES` / `REGIONS` no topo de `lib/data.js`.
- **Novas colunas na tabela:** objeto `VIEWS` em `public/app.js`.

## Licença

MIT. Marca, produto e dados reais do Kalodata pertencem aos seus donos; este
projeto não é afiliado a eles.
