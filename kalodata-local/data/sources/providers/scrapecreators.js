'use strict';

/*
 * ScrapeCreators preset — https://scrapecreators.com (TikTok Shop API).
 *
 * Auth: API key in the `x-api-key` header.
 * Endpoint used: GET /v1/tiktok/shop/search?query=<kw>&amount=<n>
 *   → { success, total_products, products: [{ product_id, title, price,
 *        sold_count, image, seller_info: { seller_id, ... } }] }
 *
 * Because a keyword search is a *snapshot*, we estimate revenue as
 * price × sold_count (the same public-signal method Kalodata uses). Growth
 * needs history — run this repeatedly and diff snapshots to populate trends
 * (see README "Building trends from snapshots").
 *
 *   DATA_SOURCE=provider PROVIDER=scrapecreators \
 *     PROVIDER_API_KEY=sk_xxx \
 *     PROVIDER_QUERIES="makeup,skincare,kitchen,fitness,supplements" \
 *     node server.js
 */

const defaultBaseUrl = 'https://api.scrapecreators.com';

const DEFAULT_QUERIES = ['makeup', 'skincare', 'kitchen gadget', 'fitness', 'home decor'];

async function fetch(ctx) {
  if (!ctx.apiKey) {
    throw new Error(
      'ScrapeCreators needs an API key. Set PROVIDER_API_KEY (get one at https://scrapecreators.com).'
    );
  }
  const queries = ctx.queries.length ? ctx.queries : DEFAULT_QUERIES;
  const headers = { 'x-api-key': ctx.apiKey };

  const products = [];
  const shops = new Map();

  for (const q of queries) {
    const url =
      `${ctx.baseUrl}/v1/tiktok/shop/search` +
      `?query=${encodeURIComponent(q)}&amount=${ctx.amount}`;
    const data = await ctx.fetchJson(url, headers);
    const list = data.products || data.data || [];

    for (const p of list) {
      const price = ctx.num(p.price ?? p.price_amount);
      const sold = ctx.num(p.sold_count ?? p.soldCount ?? p.sales);
      const revenue = price != null && sold != null ? Math.round(price * sold) : undefined;
      products.push({
        id: p.product_id || p.id,
        name: p.title || p.name,
        category: q, // keyword acts as the category facet for search results
        region: p.region || ctx.env.PROVIDER_REGION || 'US',
        price,
        units: sold,
        revenue,
        rating: ctx.num(p.rating),
      });

      const seller = p.seller_info || p.shopInfo || {};
      const sid = seller.seller_id || seller.sellerId;
      if (sid) {
        const cur = shops.get(sid) || {
          id: sid,
          name: seller.seller_name || seller.name || `Seller ${sid}`,
          category: q,
          region: p.region || 'US',
          gmv: 0,
          products: 0,
          followers: ctx.num(seller.follower_count),
        };
        cur.gmv += revenue || 0;
        cur.products += 1;
        shops.set(sid, cur);
      }
    }
  }

  return { products, shops: [...shops.values()] };
}

module.exports = { defaultBaseUrl, fetch };
