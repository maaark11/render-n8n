# Import folder — bring your own real data

Drop CSV or JSON files here and run the app with `DATA_SOURCE=file`:

```bash
DATA_SOURCE=file node server.js
```

The loader looks for these files (any subset — missing ones are just empty):

| File                        | Powers the module |
|-----------------------------|-------------------|
| `products.csv` / `.json`    | Product           |
| `creators.csv` / `.json`    | Creator           |
| `videos.csv` / `.json`      | Video             |
| `livestreams.csv` / `.json` | Livestream        |
| `shops.csv` / `.json`       | Shop              |

Category and Explore (overview) are computed automatically from whatever you load.

## Column names

Use the same field names the app uses. Numbers may include `$`, `,` or `%` —
they are cleaned automatically. Time series go in a single column as
pipe-separated values, e.g. `980000|1010000|1284500` (or a JSON array).

- **products**: `name, category, region, price, revenue, revenueSeries, units, growth, commission, shops, creators, rating`
- **creators**: `handle, category, region, followers, gmv, gmvSeries, growth, videos, engagement`
- **videos**: `title, creator, product, category, region, views, likes, comments, shares, gmv, engagement, postedDaysAgo`
- **livestreams**: `creator, category, region, gmv, peakViewers, durationMin, productsSold, topProduct, avgWatchMin`
- **shops**: `name, category, region, gmv, gmvSeries, growth, products, avgPrice, followers`

Missing `id`, `icon`, or `growth` are filled in automatically (`growth` is
derived from the series when absent).

The `products.csv` and `creators.csv` here are a small **working sample** — replace
them with your real export. JSON is also accepted: an array of objects, or an
object like `{ "products": [ ... ] }`.
