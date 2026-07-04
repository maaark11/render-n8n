# Kalodata Local — TikTok Shop Analytics (demo)

A **self-contained, offline** analytics dashboard inspired by the architecture of
[kalodata.com](https://www.kalodata.com/) — a TikTok Shop analytics platform.
It reproduces the product's **structure and UX** (the 7 analytics modules,
sortable revenue/GMV tables, growth trends, filters, detail drawers) on top of
**100% synthetic, deterministic data**.

> This is a learning/prototype project. It is **not affiliated with Kalodata**,
> contains **no real TikTok data**, and does not scrape or log into any external
> service. All numbers are generated locally from a fixed seed.

---

## Why it "just runs"

- **Zero runtime dependencies.** The server uses only Node.js built-ins
  (`http`, `fs`, `path`, `url`). There is **no `npm install`** step.
- **No database.** Data is generated in memory at boot from a seeded PRNG, so it
  is fully reproducible (same seed → same dataset) yet needs no migrations.
- **No internet.** Charts are hand-rolled inline SVG — nothing is fetched from a
  CDN. Works completely offline.

## Run it

### Option A — plain Node (simplest)

```bash
cd kalodata-local
node server.js
```

Then open **http://localhost:8080**.

Change the port with `PORT=3000 node server.js`.

### Option B — Docker

```bash
cd kalodata-local
docker compose up --build
```

Open **http://localhost:8080**.

---

## Architecture

```
kalodata-local/
├── server.js            # Zero-dep Node HTTP server: static files + JSON API
├── data/
│   └── generate.js      # Seeded deterministic synthetic-data generator
├── public/
│   ├── index.html       # App shell (sidebar + topbar + drawer)
│   ├── styles.css       # Dark SaaS theme
│   ├── charts.js        # Inline-SVG sparklines / line charts / bar lists
│   └── app.js           # Vanilla-JS SPA: routing, filters, sorting, drawer
├── Dockerfile
├── docker-compose.yml
└── package.json         # scripts only — no dependencies
```

### Data model (mirrors Kalodata's modules)

| Collection    | Key fields |
|---------------|-----------|
| `products`    | name, category, price, revenue (+14-day series), units, growth, competing shops, commission |
| `creators`    | handle, followers, GMV (+series), growth, videos, engagement |
| `videos`      | title, creator, product, views, likes, GMV driven, engagement |
| `livestreams` | creator, GMV, peak viewers, duration, products sold, avg watch |
| `shops`       | name, GMV (+series), growth, products, avg price, followers |
| `categories`  | aggregated GMV, growth, product/creator counts |
| `overview`    | KPIs, platform GMV trend, top movers/creators, category breakdown |

### API

All endpoints support `?sort=&order=&page=&pageSize=` plus contextual filters
(`category`, `region`, `trend`, `minPrice`, `maxPrice`, `search`).

```
GET /api/overview
GET /api/products?category=Health&trend=growing&sort=growth&order=desc
GET /api/creators
GET /api/videos
GET /api/livestreams
GET /api/shops
GET /api/categories
GET /api/meta
GET /api/health
```

## Frontend modules

- **Explore** — KPI cards, platform GMV trend chart, GMV-by-category, top movers, top creators
- **Category** — GMV + momentum cards per category (click to drill into Products)
- **Product** — trending products, sortable by revenue/growth/units/shops, price + trend filters
- **Creator** — influencers ranked by GMV, followers, engagement
- **Video** — short videos indexed by product and sales driven
- **Livestream** — live sessions ranked by GMV and reach
- **Shop** — competitor shops and their performance

Global **region** selector and **7D / 30D / 90D** range control live in the top bar.
Clicking any row opens a **detail drawer** with a trend chart and key stats.

## Notes on data realism

Numbers are plausible but synthetic: revenue/GMV series are generated with a
drift + volatility model so some items trend up (green) and others down (red),
matching how a real momentum-tracking tool would look. Regenerate with a
different look by changing `SEED` in `data/generate.js`.
