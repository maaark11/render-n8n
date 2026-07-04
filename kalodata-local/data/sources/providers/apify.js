'use strict';

/*
 * Apify preset — https://apify.com (TikTok Shop scraper actors).
 *
 * Apify is actor-based: you run a TikTok Shop scraper actor, it writes a
 * dataset, and we read that dataset's items. This preset reads the actor's
 * LAST finished run by default.
 *
 * Auth: Apify API token in PROVIDER_API_KEY.
 * Config: APIFY_ACTOR = actor id, e.g. "excavator~tiktok-shop-scraper".
 * Endpoint: GET /v2/acts/<actor>/runs/last/dataset/items?token=<t>&clean=true
 *
 *   DATA_SOURCE=provider PROVIDER=apify \
 *     PROVIDER_API_KEY=apify_api_xxx \
 *     APIFY_ACTOR=excavator~tiktok-shop-scraper \
 *     node server.js
 *
 * (Run the actor at least once in Apify first so a dataset exists.)
 */

const defaultBaseUrl = 'https://api.apify.com';

async function fetch(ctx) {
  const token = ctx.apiKey;
  const actor = ctx.env.APIFY_ACTOR;
  if (!token) throw new Error('Apify needs a token. Set PROVIDER_API_KEY to your Apify API token.');
  if (!actor) {
    throw new Error('Set APIFY_ACTOR to the scraper actor id (e.g. excavator~tiktok-shop-scraper).');
  }

  const datasetId = ctx.env.APIFY_DATASET_ID;
  const url = datasetId
    ? `${ctx.baseUrl}/v2/datasets/${datasetId}/items?token=${token}&clean=true`
    : `${ctx.baseUrl}/v2/acts/${actor}/runs/last/dataset/items?token=${token}&clean=true`;

  const items = await ctx.fetchJson(url, {});
  const list = Array.isArray(items) ? items : items.items || [];

  const products = [];
  const shops = new Map();

  for (const it of list) {
    const price = ctx.num(it.price ?? it.priceAmount);
    const sold = ctx.num(it.soldCount ?? it.sold_count ?? it.sales);
    const revenue = price != null && sold != null ? Math.round(price * sold) : undefined;
    products.push({
      id: it.productId || it.product_id || it.id,
      name: it.title || it.name,
      category: it.category || it.categoryName || 'Uncategorized',
      region: it.region || it.country || ctx.env.PROVIDER_REGION || 'US',
      price,
      units: sold,
      revenue,
      rating: ctx.num(it.rating ?? it.reviewRatingAverage),
    });

    const sid = it.sellerId || it.seller_id;
    if (sid) {
      const cur = shops.get(sid) || {
        id: sid,
        name: it.sellerName || it.storeName || `Seller ${sid}`,
        category: it.category || 'Uncategorized',
        region: it.region || 'US',
        gmv: 0,
        products: 0,
        followers: ctx.num(it.sellerFollowerCount),
        rating: ctx.num(it.sellerRating),
      };
      cur.gmv += revenue || 0;
      cur.products += 1;
      shops.set(sid, cur);
    }
  }

  return { products, shops: [...shops.values()] };
}

module.exports = { defaultBaseUrl, fetch };
