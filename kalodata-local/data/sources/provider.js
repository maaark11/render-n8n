'use strict';

/*
 * Provider source — pull REAL TikTok Shop market data from a third-party API.
 *
 * This is the closest architecture to how Kalodata itself works: a data
 * provider does the scraping/aggregation, and we consume their JSON and render
 * it. You bring an API key; we handle fetching, mapping and derivation.
 *
 *   DATA_SOURCE=provider PROVIDER=scrapecreators PROVIDER_API_KEY=xxx node server.js
 *   DATA_SOURCE=provider PROVIDER=apify PROVIDER_API_KEY=<token> APIFY_ACTOR=<id> node server.js
 *   DATA_SOURCE=provider PROVIDER=mock node server.js        # canned data, no key
 *
 * Each preset in ./providers/<name>.js exports:
 *   defaultBaseUrl : string
 *   async fetch(ctx) -> { products, creators, videos, livestreams, shops }
 *     (arrays of rows already using OUR field names; strings are fine — the
 *      shared normalizer coerces numbers, fills ids/icons, parses series.)
 */

const { finalize } = require('../derive');
const { normalize } = require('./file');

const PRESETS = {
  mock: () => require('./providers/mock'),
  generic: () => require('./providers/generic'),
  scrapecreators: () => require('./providers/scrapecreators'),
  apify: () => require('./providers/apify'),
};

function num(v) {
  if (v == null || v === '') return undefined;
  const n = Number(String(v).replace(/[$,%\s]/g, ''));
  return Number.isNaN(n) ? undefined : n;
}

async function fetchJson(url, headers = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch unavailable — Node 18+ required for the provider source');
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Provider HTTP ${res.status} for ${url}${body ? ' — ' + body.slice(0, 200) : ''}`);
  }
  return res.json();
}

async function load() {
  const name = (process.env.PROVIDER || 'mock').toLowerCase();
  const factory = PRESETS[name];
  if (!factory) {
    throw new Error(
      `Unknown PROVIDER "${name}". Available: ${Object.keys(PRESETS).join(', ')}`
    );
  }
  const preset = factory();

  const ctx = {
    apiKey: process.env.PROVIDER_API_KEY || '',
    baseUrl: process.env.PROVIDER_BASE_URL || preset.defaultBaseUrl,
    queries: (process.env.PROVIDER_QUERIES || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    amount: num(process.env.PROVIDER_AMOUNT) || 50,
    env: process.env,
    num,
    fetchJson,
  };

  const raw = await preset.fetch(ctx);

  const db = {};
  for (const c of ['products', 'creators', 'videos', 'livestreams', 'shops']) {
    db[c] = normalize(c, raw[c] || []);
  }
  const anyRows = Object.values(db).reduce((s, arr) => s + arr.length, 0);
  if (!anyRows) {
    throw new Error(`Provider "${name}" returned no rows. Check credentials/queries.`);
  }

  return finalize(db, {
    source: `provider:${name}`,
    provider: name,
    baseUrl: ctx.baseUrl,
  });
}

module.exports = { load };
