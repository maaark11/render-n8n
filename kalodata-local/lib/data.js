'use strict';

/*
 * Synthetic data engine for the Kalodata-style analytics demo.
 *
 * Everything here is generated locally from a fixed seed, so the dataset is
 * identical on every run and on every machine. No network, no scraping, no
 * real TikTok Shop data — purely fabricated numbers that resemble the shape
 * of a TikTok Shop analytics product.
 */

// ---- Deterministic PRNG (mulberry32) -------------------------------------

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

const SEED = 20240704;
const rng = mulberry32(SEED);

const rand = () => rng();
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min, max, dp = 2) => {
  const v = rand() * (max - min) + min;
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickWeighted = (arr) => {
  // Skew toward the front of the array so "top" items concentrate revenue.
  const i = Math.floor(Math.pow(rand(), 2) * arr.length);
  return arr[Math.min(i, arr.length - 1)];
};

// ---- Reference dimensions ------------------------------------------------

const CATEGORIES = [
  'Beauty & Personal Care',
  'Womenswear & Underwear',
  'Menswear & Underwear',
  'Phones & Electronics',
  'Home Supplies',
  'Kitchenware',
  'Health',
  'Sports & Outdoor',
  'Toys & Hobbies',
  'Fashion Accessories',
  'Food & Beverages',
  'Pet Supplies',
  'Baby & Maternity',
  'Automotive & Motorcycle',
];

const REGIONS = [
  { code: 'US', name: 'United States', currency: '$' },
  { code: 'UK', name: 'United Kingdom', currency: '£' },
  { code: 'ID', name: 'Indonesia', currency: 'Rp' },
  { code: 'TH', name: 'Thailand', currency: '฿' },
  { code: 'VN', name: 'Vietnam', currency: '₫' },
  { code: 'MY', name: 'Malaysia', currency: 'RM' },
  { code: 'PH', name: 'Philippines', currency: '₱' },
  { code: 'SG', name: 'Singapore', currency: 'S$' },
];

const PRODUCT_ADJ = ['Ultra', 'Pro', 'Max', 'Mini', 'Premium', 'Smart', 'Eco', 'Glow', 'Aqua', 'Turbo', 'Luxe', 'Nano', 'Flex', 'Prime', 'Fresh'];
const PRODUCT_NOUN = {
  'Beauty & Personal Care': ['Serum', 'Lip Tint', 'Face Mask', 'Cleanser', 'Sunscreen', 'Hair Oil', 'Perfume', 'Foundation'],
  'Womenswear & Underwear': ['Bodysuit', 'Leggings', 'Bralette', 'Dress', 'Shapewear', 'Cardigan', 'Jumpsuit'],
  'Menswear & Underwear': ['Boxers', 'Polo Shirt', 'Joggers', 'Hoodie', 'Tank Top', 'Cargo Pants'],
  'Phones & Electronics': ['Earbuds', 'Charger', 'Power Bank', 'Phone Case', 'Smart Watch', 'LED Strip', 'Selfie Ring'],
  'Home Supplies': ['Organizer', 'Blanket', 'Wall Hook', 'Storage Box', 'Curtain', 'Rug'],
  'Kitchenware': ['Blender', 'Knife Set', 'Air Fryer Liner', 'Spice Rack', 'Tumbler', 'Silicone Mat'],
  'Health': ['Vitamin Gummies', 'Collagen Powder', 'Posture Corrector', 'Massage Gun', 'Sleep Aid'],
  'Sports & Outdoor': ['Resistance Band', 'Yoga Mat', 'Water Bottle', 'Jump Rope', 'Camping Light'],
  'Toys & Hobbies': ['Fidget Set', 'Building Blocks', 'Plush Toy', 'RC Car', 'Puzzle'],
  'Fashion Accessories': ['Sunglasses', 'Tote Bag', 'Bucket Hat', 'Necklace', 'Watch', 'Belt'],
  'Food & Beverages': ['Protein Bar', 'Matcha Kit', 'Chili Crisp', 'Coffee Blend', 'Gummy Snack'],
  'Pet Supplies': ['Dog Harness', 'Cat Tower', 'Pet Brush', 'Chew Toy', 'Feeder Bowl'],
  'Baby & Maternity': ['Baby Wrap', 'Teether', 'Diaper Bag', 'Night Light', 'Onesie'],
  'Automotive & Motorcycle': ['Phone Mount', 'Seat Cover', 'Trunk Organizer', 'LED Kit', 'Cleaning Gel'],
};

const CREATOR_HANDLES = ['glow', 'daily', 'shop', 'finds', 'vibe', 'haul', 'deals', 'trend', 'plug', 'life', 'lab', 'diary', 'edit', 'obsessed', 'era', 'club', 'muse', 'hq', 'central', 'world'];
const FIRST = ['ava', 'mia', 'noah', 'liam', 'zoe', 'kai', 'ivy', 'leo', 'nova', 'jade', 'ryan', 'skye', 'dev', 'luna', 'max', 'ari', 'sam', 'remy', 'theo', 'nia'];

const VIDEO_HOOKS = [
  'This changed my whole routine',
  'Don\'t buy this until you watch',
  'Why is nobody talking about this',
  'I tested it for 30 days',
  'TikTok made me buy it',
  'Restocked 5 times already',
  'The viral one everyone wants',
  'Honest review after 1 month',
  'This sold out in 2 hours',
  'Amazon vs TikTok Shop dupe',
];

// ---- Helpers -------------------------------------------------------------

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// A 30-day trend that trends toward the current value with noise.
function makeTrend(total, days = 30) {
  const out = [];
  let base = total / days;
  const momentum = randFloat(-0.4, 0.9); // negative = declining, positive = rising
  for (let i = 0; i < days; i++) {
    const ramp = 1 + (momentum * i) / days;
    const noise = randFloat(0.7, 1.3);
    out.push(Math.max(0, Math.round(base * ramp * noise)));
  }
  return out;
}

function growthFrom(trend) {
  const half = Math.floor(trend.length / 2);
  const first = trend.slice(0, half).reduce((a, b) => a + b, 0) || 1;
  const second = trend.slice(half).reduce((a, b) => a + b, 0);
  return Math.round(((second - first) / first) * 1000) / 10; // one decimal %
}

// ---- Generators ----------------------------------------------------------

function genShops(n) {
  const shops = [];
  for (let i = 0; i < n; i++) {
    const cat = pick(CATEGORIES);
    const region = pick(REGIONS);
    const name = `${pick(PRODUCT_ADJ)} ${slug(cat).split('-')[0]}${randInt(1, 99)}`.replace(/\b\w/g, (c) => c.toUpperCase());
    const revenue = Math.round(randFloat(20000, 4000000, 0) / (i + 3) * 8);
    const trend = makeTrend(revenue);
    shops.push({
      id: 'shop_' + (1000 + i),
      name,
      category: cat,
      region: region.code,
      revenue,
      productCount: randInt(3, 240),
      rating: randFloat(3.6, 5.0, 1),
      followers: randInt(500, 2500000),
      growthRate: growthFrom(trend),
      trend,
    });
  }
  return shops.sort((a, b) => b.revenue - a.revenue);
}

function genProducts(n, shops) {
  const products = [];
  for (let i = 0; i < n; i++) {
    const cat = pick(CATEGORIES);
    const region = pick(REGIONS);
    const noun = pick(PRODUCT_NOUN[cat]);
    const name = `${pick(PRODUCT_ADJ)} ${noun}`;
    const price = randFloat(4.99, 189.99);
    const unitsSold = Math.round(randFloat(80, 900000, 0) / Math.sqrt(i + 1));
    const revenue = Math.round(price * unitsSold);
    const gmv = Math.round(revenue * randFloat(1.0, 1.25));
    const trend = makeTrend(unitsSold);
    const shop = pickWeighted(shops.filter((s) => s.category === cat).length ? shops.filter((s) => s.category === cat) : shops);
    products.push({
      id: 'prod_' + (10000 + i),
      name,
      category: cat,
      region: region.code,
      price,
      unitsSold,
      revenue,
      gmv,
      commissionRate: randFloat(5, 30, 1),
      rating: randFloat(3.5, 5.0, 1),
      growthRate: growthFrom(trend),
      creatorsCount: randInt(1, 480),
      videosCount: randInt(1, 1200),
      shopId: shop ? shop.id : null,
      shopName: shop ? shop.name : 'Independent',
      launchDaysAgo: randInt(3, 480),
      trend,
    });
  }
  return products.sort((a, b) => b.revenue - a.revenue);
}

function genCreators(n, products) {
  const creators = [];
  for (let i = 0; i < n; i++) {
    const cat = pick(CATEGORIES);
    const region = pick(REGIONS);
    const handle = `${pick(FIRST)}.${pick(CREATOR_HANDLES)}`;
    const followers = Math.round(randFloat(2000, 8000000, 0) / Math.sqrt(i + 1));
    const revenue = Math.round(randFloat(500, 3200000, 0) / Math.sqrt(i + 1));
    const trend = makeTrend(revenue);
    const catProducts = products.filter((p) => p.category === cat);
    const topProducts = [];
    for (let k = 0; k < 3 && k < catProducts.length; k++) {
      topProducts.push(catProducts[randInt(0, Math.min(catProducts.length - 1, 40))].name);
    }
    creators.push({
      id: 'creator_' + (20000 + i),
      handle: '@' + handle,
      name: handle.split('.')[0].replace(/\b\w/g, (c) => c.toUpperCase()),
      category: cat,
      region: region.code,
      followers,
      revenue,
      videosCount: randInt(4, 900),
      avgViews: randInt(1200, 4200000),
      engagementRate: randFloat(1.5, 18, 1),
      gpm: randFloat(20, 900), // revenue per 1k views
      growthRate: growthFrom(trend),
      topProducts: [...new Set(topProducts)],
      trend,
    });
  }
  return creators.sort((a, b) => b.revenue - a.revenue);
}

function genVideos(n, products, creators) {
  const videos = [];
  for (let i = 0; i < n; i++) {
    const product = pickWeighted(products);
    const creator = pickWeighted(creators);
    const views = Math.round(randFloat(2000, 22000000, 0) / Math.sqrt(i + 1));
    const revenue = Math.round(views * randFloat(0.002, 0.09));
    const trend = makeTrend(views);
    videos.push({
      id: 'video_' + (30000 + i),
      title: pick(VIDEO_HOOKS),
      category: product.category,
      region: product.region,
      creatorHandle: creator.handle,
      productName: product.name,
      views,
      revenue,
      likes: Math.round(views * randFloat(0.02, 0.16)),
      comments: Math.round(views * randFloat(0.001, 0.02)),
      shares: Math.round(views * randFloat(0.001, 0.03)),
      engagementRate: randFloat(2, 22, 1),
      gpm: randFloat(15, 800),
      postedDaysAgo: randInt(1, 120),
      growthRate: growthFrom(trend),
      trend,
    });
  }
  return videos.sort((a, b) => b.views - a.views);
}

function genLivestreams(n, shops, creators) {
  const lives = [];
  for (let i = 0; i < n; i++) {
    const creator = pickWeighted(creators);
    const revenue = Math.round(randFloat(200, 900000, 0) / Math.sqrt(i + 1));
    const viewers = randInt(50, 380000);
    const trend = makeTrend(revenue);
    lives.push({
      id: 'live_' + (40000 + i),
      title: `${creator.name}'s Live · ${pick(['Mega Sale', 'Restock Drop', 'New Arrivals', 'Flash Deals', 'Weekend Haul'])}`,
      category: creator.category,
      region: creator.region,
      creatorHandle: creator.handle,
      revenue,
      viewers,
      peakViewers: Math.round(viewers * randFloat(1.1, 2.4)),
      durationMin: randInt(20, 480),
      itemsSold: randInt(10, 42000),
      avgWatchMin: randFloat(1.5, 22, 1),
      gpm: randFloat(30, 1200),
      growthRate: growthFrom(trend),
      trend,
    });
  }
  return lives.sort((a, b) => b.revenue - a.revenue);
}

// ---- Build the whole dataset once ---------------------------------------

const shops = genShops(120);
const products = genProducts(500, shops);
const creators = genCreators(300, products);
const videos = genVideos(600, products, creators);
const livestreams = genLivestreams(160, shops, creators);

function sum(arr, key) {
  return arr.reduce((a, b) => a + (b[key] || 0), 0);
}

function overview() {
  const totalRevenue = sum(products, 'revenue');
  const totalUnits = sum(products, 'unitsSold');
  // Aggregate a 30-day platform trend from product trends.
  const days = 30;
  const revTrend = new Array(days).fill(0);
  for (const p of products) {
    for (let i = 0; i < days; i++) revTrend[i] += (p.trend[i] || 0) * p.price;
  }
  const catRevenue = {};
  for (const p of products) catRevenue[p.category] = (catRevenue[p.category] || 0) + p.revenue;
  const topCategories = Object.entries(catRevenue)
    .map(([category, revenue]) => ({ category, revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  const regionRevenue = {};
  for (const p of products) regionRevenue[p.region] = (regionRevenue[p.region] || 0) + p.revenue;
  const byRegion = Object.entries(regionRevenue)
    .map(([region, revenue]) => ({ region, revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    kpis: {
      totalRevenue: Math.round(totalRevenue),
      totalUnits,
      trackedProducts: products.length,
      trackedCreators: creators.length,
      trackedVideos: videos.length,
      trackedShops: shops.length,
      avgCommission: Math.round((sum(products, 'commissionRate') / products.length) * 10) / 10,
    },
    revenueTrend: revTrend.map((v) => Math.round(v)),
    topCategories,
    byRegion,
    topProducts: products.slice(0, 5),
    topCreators: creators.slice(0, 5),
    trendingVideos: videos.slice(0, 5),
  };
}

module.exports = {
  CATEGORIES,
  REGIONS,
  shops,
  products,
  creators,
  videos,
  livestreams,
  overview,
};
