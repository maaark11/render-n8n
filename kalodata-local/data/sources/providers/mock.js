'use strict';

/*
 * Mock provider — canned, provider-shaped data. No API key, no network.
 * Lets you see the *provider pipeline* (fetch → map → derive → serve) working
 * exactly like a real one, before you plug in credentials.
 *
 *   DATA_SOURCE=provider PROVIDER=mock node server.js
 */

const defaultBaseUrl = 'mock://local';

async function fetch(ctx) {
  // Rows already use our field names; the shared normalizer coerces the rest.
  const products = [
    { name: 'Rosewater Facial Toner', category: 'Beauty & Personal Care', region: 'US', price: 18.5, revenue: 1490000, units: 80540, revenueSeries: '1100000|1180000|1250000|1320000|1390000|1440000|1490000', commission: 20, shops: 51, creators: 720, rating: 4.7 },
    { name: 'Ceramic Nonstick Pan Set', category: 'Kitchenware', region: 'US', price: 64.99, revenue: 2310000, units: 35544, revenueSeries: '2600000|2520000|2460000|2410000|2370000|2340000|2310000', commission: 12, shops: 77, creators: 210, rating: 4.5 },
    { name: 'Noise-Cancelling Headphones', category: 'Phones & Electronics', region: 'UK', price: 89.0, revenue: 3120000, units: 35056, revenueSeries: '1900000|2150000|2400000|2650000|2850000|3000000|3120000', commission: 10, shops: 63, creators: 940, rating: 4.6 },
    { name: 'Resistance Bands Bundle', category: 'Sports & Outdoor', region: 'US', price: 27.99, revenue: 880000, units: 31440, revenueSeries: '640000|690000|735000|780000|820000|855000|880000', commission: 22, shops: 44, creators: 300, rating: 4.8 },
    { name: 'Daily Multivitamin Gummies', category: 'Health', region: 'US', price: 21.0, revenue: 1650000, units: 78571, revenueSeries: '1560000|1575000|1595000|1610000|1625000|1638000|1650000', commission: 25, shops: 92, creators: 510, rating: 4.4 },
    { name: 'LED Sunset Projector Lamp', category: 'Home Supplies', region: 'ID', price: 15.99, revenue: 1240000, units: 77548, revenueSeries: '520000|640000|760000|880000|1000000|1130000|1240000', commission: 18, shops: 130, creators: 1100, rating: 4.3 },
    { name: 'Orthopedic Dog Bed', category: 'Pet Supplies', region: 'US', price: 44.5, revenue: 720000, units: 16179, revenueSeries: '810000|790000|770000|755000|742000|730000|720000', commission: 15, shops: 38, creators: 160, rating: 4.7 },
    { name: 'Matte Liquid Lipstick Set', category: 'Beauty & Personal Care', region: 'MY', price: 12.99, revenue: 2020000, units: 155504, revenueSeries: '1200000|1380000|1560000|1720000|1850000|1950000|2020000', commission: 24, shops: 210, creators: 1500, rating: 4.5 },
  ];

  const creators = [
    { handle: '@glowqueen', category: 'Beauty & Personal Care', region: 'US', followers: 1120000, gmv: 690000, gmvSeries: '480000|520000|560000|600000|640000|668000|690000', videos: 410, engagement: 8.4 },
    { handle: '@thekitchennerd', category: 'Kitchenware', region: 'US', followers: 540000, gmv: 380000, gmvSeries: '430000|418000|405000|396000|390000|384000|380000', videos: 260, engagement: 6.9 },
    { handle: '@gadgetgabe', category: 'Phones & Electronics', region: 'UK', followers: 980000, gmv: 810000, gmvSeries: '520000|590000|660000|720000|765000|790000|810000', videos: 520, engagement: 5.6 },
    { handle: '@wellnesswithamy', category: 'Health', region: 'US', followers: 730000, gmv: 470000, gmvSeries: '360000|388000|412000|432000|448000|460000|470000', videos: 300, engagement: 9.7 },
  ];

  const shops = [
    { name: 'AuraGlow Official', category: 'Beauty & Personal Care', region: 'US', gmv: 4200000, gmvSeries: '3100000|3350000|3600000|3820000|3980000|4100000|4200000', products: 84, avgPrice: 19.9, followers: 620000, rating: 4.7 },
    { name: 'PrimeTech Store', category: 'Phones & Electronics', region: 'UK', gmv: 5100000, gmvSeries: '5600000|5450000|5330000|5240000|5170000|5130000|5100000', products: 120, avgPrice: 58.0, followers: 940000, rating: 4.5 },
    { name: 'FitZone Gear', category: 'Sports & Outdoor', region: 'US', gmv: 1900000, gmvSeries: '1400000|1520000|1620000|1710000|1790000|1850000|1900000', products: 54, avgPrice: 34.5, followers: 210000, rating: 4.8 },
  ];

  return { products, creators, shops };
}

module.exports = { defaultBaseUrl, fetch };
