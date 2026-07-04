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

## Where does the data come from? (synthetic vs real)

**How the real Kalodata gets its data:** TikTok has **no public API** for
competitor/market analytics. Kalodata's team **scrapes publicly visible TikTok
Shop data** (the public "sold" counter on product pages, video views,
engagement, creator profiles) and then uses **AI models to estimate** GMV, sales
volume and ad spend. That's why they state the numbers are estimates, not exact
figures. There are three realistic ways to feed *real* data into a local clone:

| Route | What you get | Cost / requirement | Legality |
|-------|--------------|--------------------|----------|
| **TikTok Shop Open API** | **Your own shop only** — products, orders, analytics | Free, but OAuth + Partner Center approval | ✅ Official |
| **Third-party data API** (Apify, ScrapeCreators, EchoTik…) | Market/competitor data | Paid API key | ⚠️ Provider's terms |
| **Scrape TikTok yourself** | Public "sold" counts etc. | DIY, fragile | ❌ Against TikTok ToS |

This project ships a **pluggable data-source layer** so the same UI runs on any
of them. Three sources are implemented:

```bash
node server.js                                   # synthetic (default) — fake but realistic
DATA_SOURCE=file node server.js                  # real CSV/JSON from data/import/
DATA_SOURCE=provider PROVIDER=mock node server.js  # third-party pipeline, canned demo (no key)
```

### Third-party provider (real market data)

This is the closest architecture to Kalodata. A provider does the
scraping/aggregation; we fetch their JSON, estimate revenue as
`price × sold_count`, and render it. Presets included:

```bash
# ScrapeCreators (https://scrapecreators.com) — REST + x-api-key
DATA_SOURCE=provider PROVIDER=scrapecreators \
  PROVIDER_API_KEY=sk_xxx \
  PROVIDER_QUERIES="makeup,skincare,kitchen,fitness,supplements" \
  node server.js

# Apify (https://apify.com) — actor dataset
DATA_SOURCE=provider PROVIDER=apify \
  PROVIDER_API_KEY=apify_api_xxx \
  APIFY_ACTOR=excavator~tiktok-shop-scraper \
  node server.js

# Generic — any REST API, wired entirely through env vars
DATA_SOURCE=provider PROVIDER=generic \
  PROVIDER_API_KEY=xxx \
  PROVIDER_PRODUCTS_URL="https://api.example.com/tiktok/products?limit=200" \
  PROVIDER_ROOT="data" \
  PROVIDER_MAP='{"name":"title","units":"sold_count"}' \
  node server.js
```

Run `PROVIDER=mock` first to see the full fetch → map → derive → render pipeline
with **no API key**. Add a new provider by dropping a preset into
`data/sources/providers/` (each exports `defaultBaseUrl` and
`async fetch(ctx) → { products, creators, videos, livestreams, shops }`).

**Building trends from snapshots.** A single provider call is a snapshot, so
`growth` starts at 0. This is exactly how Kalodata derives momentum: run the
provider on a schedule and diff the `sold_count` over time. Persist each run's
output as `data/import/products.json` and the `file`/`derive` layer will chart
the history.

### File import (zero credential)

The **file** source is the zero-credential, zero-scraping path: export data from
anywhere (your TikTok Shop, a provider, a spreadsheet) into `data/import/` and it
renders in the same dashboard. See [`data/import/README.md`](data/import/README.md)
for the column format.

## Architecture

```
kalodata-local/
├── server.js            # Zero-dep Node HTTP server: static files + JSON API
├── data/
│   ├── taxonomy.js      # Shared categories (name+icon) and regions
│   ├── derive.js        # Deterministic categories + overview aggregation
│   ├── generate.js      # Seeded synthetic-data generator
│   ├── sources/         # Pluggable data sources
│   │   ├── index.js     #   resolver (DATA_SOURCE env)
│   │   ├── synthetic.js #   fake data
│   │   ├── file.js      #   real CSV/JSON importer
│   │   ├── provider.js  #   third-party API fetch + map
│   │   └── providers/   #   presets: mock, scrapecreators, apify, generic
│   └── import/          # Drop your real CSV/JSON here (DATA_SOURCE=file)
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
