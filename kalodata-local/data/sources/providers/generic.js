'use strict';

/*
 * Generic preset — point it at ANY REST API that returns JSON arrays.
 * Fully driven by env vars, so you can wire up a provider we don't have a
 * dedicated preset for without writing code.
 *
 * Per collection, set a URL (only the ones you have):
 *   PROVIDER_PRODUCTS_URL, PROVIDER_CREATORS_URL, PROVIDER_VIDEOS_URL,
 *   PROVIDER_LIVESTREAMS_URL, PROVIDER_SHOPS_URL
 *
 * Optional:
 *   PROVIDER_AUTH_HEADER_NAME  header used for the key (default "x-api-key")
 *   PROVIDER_API_KEY           the key value (sent in that header)
 *   PROVIDER_ROOT              dot-path to the array in the response, e.g. "data.products"
 *   PROVIDER_MAP               JSON mapping ourField -> providerField,
 *                              e.g. {"name":"title","units":"sold_count","revenue":"gmv"}
 *
 * Example:
 *   DATA_SOURCE=provider PROVIDER=generic \
 *     PROVIDER_API_KEY=xxx \
 *     PROVIDER_PRODUCTS_URL="https://api.example.com/tiktok/products?limit=200" \
 *     PROVIDER_ROOT="data" \
 *     PROVIDER_MAP='{"name":"title","units":"sold_count"}' \
 *     node server.js
 */

const defaultBaseUrl = '';

const URL_ENV = {
  products: 'PROVIDER_PRODUCTS_URL',
  creators: 'PROVIDER_CREATORS_URL',
  videos: 'PROVIDER_VIDEOS_URL',
  livestreams: 'PROVIDER_LIVESTREAMS_URL',
  shops: 'PROVIDER_SHOPS_URL',
};

function dig(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

function applyMap(row, map) {
  if (!map) return row;
  const out = Object.assign({}, row);
  for (const [ours, theirs] of Object.entries(map)) {
    if (row[theirs] !== undefined) out[ours] = row[theirs];
  }
  return out;
}

async function fetch(ctx) {
  const headerName = ctx.env.PROVIDER_AUTH_HEADER_NAME || 'x-api-key';
  const headers = ctx.apiKey ? { [headerName]: ctx.apiKey } : {};
  const root = ctx.env.PROVIDER_ROOT || '';
  let map = null;
  if (ctx.env.PROVIDER_MAP) {
    try {
      map = JSON.parse(ctx.env.PROVIDER_MAP);
    } catch (e) {
      throw new Error('PROVIDER_MAP is not valid JSON: ' + e.message);
    }
  }

  const result = {};
  let configured = 0;
  for (const [collection, envKey] of Object.entries(URL_ENV)) {
    const url = ctx.env[envKey];
    if (!url) continue;
    configured++;
    const data = await ctx.fetchJson(url, headers);
    const arr = dig(data, root) || data;
    const rows = Array.isArray(arr) ? arr : [];
    result[collection] = rows.map((r) => applyMap(r, map));
  }

  if (!configured) {
    throw new Error(
      'Generic provider: set at least one of ' + Object.values(URL_ENV).join(', ')
    );
  }
  return result;
}

module.exports = { defaultBaseUrl, fetch };
