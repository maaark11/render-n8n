'use strict';

/*
 * Deterministic synthetic-data generator for the local Kalodata clone.
 *
 * Everything is derived from a single seed so the dataset is 100% reproducible:
 * the same seed always produces the same products, creators, videos, etc.
 * No network calls, no scraping — purely synthetic data that mirrors the
 * *shape* of TikTok Shop analytics (GMV, revenue, growth, engagement...).
 */

// --- Seeded PRNG (mulberry32) -------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260704;
const rand = mulberry32(SEED);

// --- Helpers ------------------------------------------------------------------
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const float = (min, max, d = 2) =>
  Number((rand() * (max - min) + min).toFixed(d));
const chance = (p) => rand() < p;

function trendSeries(base, points = 14, volatility = 0.25, drift = 0) {
  // Produce a plausible time series ending near `base`.
  const out = [];
  let v = base * (1 - drift);
  for (let i = 0; i < points; i++) {
    const noise = 1 + (rand() - 0.5) * volatility;
    v = Math.max(1, v * noise + (base * drift) / points);
    out.push(Math.round(v));
  }
  return out;
}

function growthFrom(series) {
  if (series.length < 2) return 0;
  const first = series[0] || 1;
  const last = series[series.length - 1];
  return Number((((last - first) / first) * 100).toFixed(1));
}

// --- Vocabulary ---------------------------------------------------------------
const CATEGORIES = [
  { name: 'Beauty & Personal Care', icon: '💄' },
  { name: 'Womenswear & Underwear', icon: '👗' },
  { name: 'Menswear & Underwear', icon: '👕' },
  { name: 'Phones & Electronics', icon: '📱' },
  { name: 'Home Supplies', icon: '🏠' },
  { name: 'Kitchenware', icon: '🍳' },
  { name: 'Health', icon: '💊' },
  { name: 'Sports & Outdoor', icon: '⚽' },
  { name: 'Toys & Hobbies', icon: '🧸' },
  { name: 'Shoes', icon: '👟' },
  { name: 'Pet Supplies', icon: '🐾' },
  { name: 'Baby & Maternity', icon: '🍼' },
  { name: 'Jewellery & Accessories', icon: '💍' },
  { name: 'Food & Beverages', icon: '🍫' },
  { name: 'Automotive', icon: '🚗' },
];

const REGIONS = ['US', 'UK', 'ID', 'MY', 'TH', 'VN', 'PH', 'BR'];

const PRODUCT_ADJ = [
  'Portable', 'Wireless', 'Rechargeable', 'Mini', 'Pro', 'Smart', 'Premium',
  'Foldable', 'Ultra', 'Compact', 'Magnetic', 'LED', 'Adjustable', 'Waterproof',
  'Anti-Aging', 'Organic', 'Heavy-Duty', 'Ergonomic', 'Fast', 'Silicone',
];
const PRODUCT_NOUN = [
  'Serum', 'Hair Dryer', 'Lip Gloss', 'Sculpting Cream', 'Massage Gun',
  'Phone Stand', 'Earbuds', 'Water Bottle', 'Yoga Mat', 'LED Strip',
  'Sneakers', 'Backpack', 'Perfume', 'Face Mask', 'Blender', 'Air Fryer',
  'Dog Bed', 'Baby Monitor', 'Necklace', 'Protein Bar', 'Car Vacuum',
  'Skincare Set', 'Lash Kit', 'Waist Trainer', 'Gaming Mouse', 'Desk Lamp',
];

const CREATOR_ADJ = [
  'glow', 'daily', 'the', 'official', 'its', 'shop', 'mrs', 'lil', 'real', 'urban',
];
const CREATOR_NAME = [
  'jasmine', 'kayla', 'mike', 'tashaglam', 'beautybyria', 'techwithsam',
  'homehacks', 'fitwithjen', 'momlife', 'gadgetguy', 'stylenova', 'chefkim',
  'petpalace', 'deals', 'trendy', 'luxe', 'vibes', 'finds', 'haul', 'reviews',
];

const VIDEO_HOOKS = [
  'This changed my routine',
  'Why is nobody talking about this',
  'TikTok made me buy it',
  '60-second glow up',
  'Restocking AGAIN',
  'Honest review after 30 days',
  'The viral one, tested',
  'You NEED this before summer',
  'Amazon vs TikTok Shop',
  'Unboxing the #1 bestseller',
  'POV: your new obsession',
  'Rating trending products',
];

// --- Emojis for placeholder thumbnails ---------------------------------------
const catIconByName = Object.fromEntries(CATEGORIES.map((c) => [c.name, c.icon]));

// --- Generators ---------------------------------------------------------------
function makeProducts(n) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const category = pick(CATEGORIES).name;
    const drift = float(-0.35, 0.6); // negative = declining, positive = growing
    const revSeries = trendSeries(int(20000, 4200000), 14, 0.22, drift);
    const revenue = revSeries[revSeries.length - 1];
    const price = float(4.99, 189.99);
    const units = Math.max(1, Math.round(revenue / price));
    const name = `${pick(PRODUCT_ADJ)} ${pick(PRODUCT_NOUN)}`;
    items.push({
      id: `P${String(i + 1).padStart(4, '0')}`,
      name,
      icon: catIconByName[category],
      category,
      region: pick(REGIONS),
      price,
      revenue,
      revenueSeries: revSeries,
      units,
      growth: growthFrom(revSeries),
      commission: float(5, 30, 0),
      shops: int(1, 240),
      creators: int(1, 900),
      rating: float(3.6, 5, 1),
      launchedDaysAgo: int(3, 400),
    });
  }
  return items;
}

function makeCreators(n) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const category = pick(CATEGORIES).name;
    const followers = int(4000, 5200000);
    const drift = float(-0.2, 0.7);
    const gmvSeries = trendSeries(int(5000, 2600000), 14, 0.28, drift);
    const gmv = gmvSeries[gmvSeries.length - 1];
    const handle =
      '@' + pick(CREATOR_ADJ) + pick(CREATOR_NAME) + (chance(0.4) ? int(1, 99) : '');
    items.push({
      id: `C${String(i + 1).padStart(4, '0')}`,
      handle,
      icon: '🧑‍🎤',
      category,
      region: pick(REGIONS),
      followers,
      gmv,
      gmvSeries,
      growth: growthFrom(gmvSeries),
      videos: int(12, 1800),
      livestreams: int(0, 320),
      avgViews: int(2000, 900000),
      engagement: float(1.2, 14.5, 1),
      revenuePerVideo: Math.round(gmv / int(12, 300)),
    });
  }
  return items;
}

function makeVideos(n, creators, products) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const creator = pick(creators);
    const product = pick(products);
    const views = int(8000, 12000000);
    const likeRate = float(0.03, 0.16);
    const likes = Math.round(views * likeRate);
    const gmv = Math.round(views * float(0.02, 0.9));
    items.push({
      id: `V${String(i + 1).padStart(4, '0')}`,
      title: pick(VIDEO_HOOKS),
      icon: '🎬',
      creator: creator.handle,
      creatorId: creator.id,
      product: product.name,
      productId: product.id,
      category: product.category,
      region: creator.region,
      views,
      likes,
      comments: Math.round(likes * float(0.02, 0.12)),
      shares: Math.round(likes * float(0.01, 0.09)),
      gmv,
      engagement: Number(((likes / views) * 100).toFixed(1)),
      postedDaysAgo: int(0, 30),
    });
  }
  return items;
}

function makeLivestreams(n, creators, products) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const creator = pick(creators);
    const duration = int(25, 320);
    const peakViewers = int(200, 180000);
    const gmv = Math.round(peakViewers * duration * float(0.05, 0.9));
    const productsSold = int(1, 45);
    items.push({
      id: `L${String(i + 1).padStart(4, '0')}`,
      title: `${creator.handle} LIVE`,
      icon: '📡',
      creator: creator.handle,
      creatorId: creator.id,
      category: creator.category,
      region: creator.region,
      gmv,
      peakViewers,
      avgViewers: Math.round(peakViewers * float(0.35, 0.7)),
      durationMin: duration,
      productsSold,
      topProduct: pick(products).name,
      avgWatchMin: float(1.5, 12, 1),
      daysAgo: int(0, 14),
    });
  }
  return items;
}

function makeShops(n, products) {
  const items = [];
  const SHOP_NAMES = [
    'GlowLab', 'NovaTech', 'PureHome', 'FitZone', 'LuxeBeauty', 'TrendPet',
    'KitchenPro', 'UrbanFit', 'BabyBliss', 'SoleMate', 'AuraSkin', 'GadgetHub',
    'DailyDeals', 'PeakOutdoor', 'VelvetWear', 'BrightBaby', 'IronForge',
    'FreshBite', 'AutoElite', 'CharmCo',
  ];
  for (let i = 0; i < n; i++) {
    const category = pick(CATEGORIES).name;
    const drift = float(-0.25, 0.65);
    const gmvSeries = trendSeries(int(80000, 9000000), 14, 0.2, drift);
    const gmv = gmvSeries[gmvSeries.length - 1];
    items.push({
      id: `S${String(i + 1).padStart(4, '0')}`,
      name: `${pick(SHOP_NAMES)} ${chance(0.5) ? 'Official' : 'Store'}`,
      icon: '🏬',
      category,
      region: pick(REGIONS),
      gmv,
      gmvSeries,
      growth: growthFrom(gmvSeries),
      products: int(6, 480),
      avgPrice: float(8, 120),
      rating: float(4, 5, 1),
      followers: int(5000, 3200000),
    });
  }
  return items;
}

function aggregateCategories(products, creators) {
  return CATEGORIES.map((c, idx) => {
    const catProducts = products.filter((p) => p.category === c.name);
    const catCreators = creators.filter((cr) => cr.category === c.name);
    const gmv = catProducts.reduce((s, p) => s + p.revenue, 0);
    const avgGrowth =
      catProducts.reduce((s, p) => s + p.growth, 0) /
      Math.max(1, catProducts.length);
    const series = trendSeries(gmv, 14, 0.15, avgGrowth / 200);
    return {
      id: `CAT${idx + 1}`,
      name: c.name,
      icon: c.icon,
      gmv,
      gmvSeries: series,
      growth: Number(avgGrowth.toFixed(1)),
      products: catProducts.length,
      creators: catCreators.length,
      avgPrice: Number(
        (
          catProducts.reduce((s, p) => s + p.price, 0) /
          Math.max(1, catProducts.length)
        ).toFixed(2)
      ),
    };
  });
}

function buildOverview(db) {
  const totalGmv = db.products.reduce((s, p) => s + p.revenue, 0);
  const totalCreators = db.creators.length;
  const totalVideos = db.videos.length;
  const totalShops = db.shops.length;

  // 14-day platform GMV trend = sum of product series
  const days = 14;
  const gmvTrend = new Array(days).fill(0);
  for (const p of db.products) {
    for (let i = 0; i < days; i++) gmvTrend[i] += p.revenueSeries[i] || 0;
  }

  const topProducts = [...db.products]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const topMovers = [...db.products]
    .sort((a, b) => b.growth - a.growth)
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
      totalCreators,
      totalVideos,
      totalShops,
      avgGrowth: Number(
        (
          db.products.reduce((s, p) => s + p.growth, 0) / db.products.length
        ).toFixed(1)
      ),
    },
    gmvTrend,
    topProducts,
    topMovers,
    topCreators,
    categoryBreakdown,
  };
}

// --- Assemble -----------------------------------------------------------------
function generate() {
  const products = makeProducts(140);
  const creators = makeCreators(90);
  const videos = makeVideos(180, creators, products);
  const livestreams = makeLivestreams(60, creators, products);
  const shops = makeShops(55, products);
  const categories = aggregateCategories(products, creators);

  const db = { products, creators, videos, livestreams, shops, categories };
  db.overview = buildOverview(db);
  db.meta = {
    seed: SEED,
    generatedFor: 'local demo — synthetic data, not affiliated with Kalodata',
    regions: REGIONS,
    categories: CATEGORIES.map((c) => c.name),
  };
  return db;
}

module.exports = { generate, CATEGORIES, REGIONS };
