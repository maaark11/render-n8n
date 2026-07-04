'use strict';

/*
 * Deterministic derivations shared by every data source.
 *
 * Given the five core collections (products, creators, videos, livestreams,
 * shops) this builds the `categories` aggregation and the `overview`
 * dashboard — with NO randomness, so imported real data yields stable output.
 */

const { CATEGORIES, REGIONS, catIcon } = require('./taxonomy');

const SERIES_LEN = 14;

// Ensure an item has a numeric series of length SERIES_LEN.
// If it already carries one, reuse it; otherwise synthesize a flat line at
// the item's current value so charts still render for real data without history.
function seriesOf(item, valueField, seriesField) {
  const s = item[seriesField];
  if (Array.isArray(s) && s.length) return s;
  const v = Number(item[valueField]) || 0;
  return new Array(SERIES_LEN).fill(v);
}

function growthFrom(series) {
  if (!series || series.length < 2) return 0;
  const first = series[0] || 1;
  const last = series[series.length - 1];
  return Number((((last - first) / first) * 100).toFixed(1));
}

function sumSeries(list, valueField, seriesField) {
  const acc = new Array(SERIES_LEN).fill(0);
  for (const item of list) {
    const s = seriesOf(item, valueField, seriesField);
    for (let i = 0; i < SERIES_LEN; i++) acc[i] += s[i] || s[s.length - 1] || 0;
  }
  return acc;
}

function aggregateCategories(products, creators) {
  // Include every category that appears in the data (plus the known taxonomy).
  const names = new Set(CATEGORIES.map((c) => c.name));
  products.forEach((p) => p.category && names.add(p.category));

  return [...names]
    .map((name, idx) => {
      const catProducts = products.filter((p) => p.category === name);
      const catCreators = creators.filter((c) => c.category === name);
      if (!catProducts.length && !catCreators.length) return null;
      const gmv = catProducts.reduce((s, p) => s + (Number(p.revenue) || 0), 0);
      const series = sumSeries(catProducts, 'revenue', 'revenueSeries');
      const avgGrowth =
        catProducts.reduce((s, p) => s + (Number(p.growth) || 0), 0) /
        Math.max(1, catProducts.length);
      return {
        id: `CAT${idx + 1}`,
        name,
        icon: catIcon(name),
        gmv,
        gmvSeries: series,
        growth: Number(avgGrowth.toFixed(1)),
        products: catProducts.length,
        creators: catCreators.length,
        avgPrice: Number(
          (
            catProducts.reduce((s, p) => s + (Number(p.price) || 0), 0) /
            Math.max(1, catProducts.length)
          ).toFixed(2)
        ),
      };
    })
    .filter(Boolean);
}

function buildOverview(db) {
  const totalGmv = db.products.reduce((s, p) => s + (Number(p.revenue) || 0), 0);

  const gmvTrend = sumSeries(db.products, 'revenue', 'revenueSeries');

  const topProducts = [...db.products]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const topMovers = [...db.products]
    .sort((a, b) => (b.growth || 0) - (a.growth || 0))
    .slice(0, 5);
  const topCreators = [...db.creators]
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 5);
  const categoryBreakdown = [...db.categories]
    .sort((a, b) => b.gmv - a.gmv)
    .map((c) => ({ name: c.name, icon: c.icon, gmv: c.gmv, growth: c.growth }));

  return {
    kpis: {
      totalGmv,
      totalProducts: db.products.length,
      totalCreators: db.creators.length,
      totalVideos: db.videos.length,
      totalShops: db.shops.length,
      avgGrowth: db.products.length
        ? Number(
            (
              db.products.reduce((s, p) => s + (Number(p.growth) || 0), 0) /
              db.products.length
            ).toFixed(1)
          )
        : 0,
    },
    gmvTrend,
    topProducts,
    topMovers,
    topCreators,
    categoryBreakdown,
  };
}

/*
 * Take a db with the five core arrays and fill in growth (where missing),
 * categories, overview and meta. Returns the same db, ready to serve.
 */
function finalize(db, meta = {}) {
  // Backfill growth from series when a source didn't provide it.
  for (const p of db.products) {
    if (p.growth == null) p.growth = growthFrom(p.revenueSeries);
  }
  for (const c of db.creators) {
    if (c.growth == null) c.growth = growthFrom(c.gmvSeries);
  }
  for (const s of db.shops) {
    if (s.growth == null) s.growth = growthFrom(s.gmvSeries);
  }

  db.categories = aggregateCategories(db.products, db.creators);
  db.overview = buildOverview(db);
  db.meta = Object.assign(
    {
      regions: REGIONS,
      categories: CATEGORIES.map((c) => c.name),
    },
    meta
  );
  return db;
}

module.exports = { finalize, aggregateCategories, buildOverview, growthFrom, SERIES_LEN };
