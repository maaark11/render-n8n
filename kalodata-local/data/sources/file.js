'use strict';

/*
 * File source — loads REAL data you drop into ./data/import/.
 *
 * For each collection it looks for `<name>.json` or `<name>.csv`:
 *   products, creators, videos, livestreams, shops
 *
 * Whatever is present is loaded; missing collections are simply empty.
 * Columns are normalised to the app schema (numbers coerced, ids filled,
 * category icons attached), then categories + overview are derived.
 *
 * This is the zero-credential, zero-scraping path: bring a CSV/JSON exported
 * from anywhere (your own TikTok Shop export, a data provider, a spreadsheet)
 * and it renders in the same UI.
 */

const fs = require('fs');
const path = require('path');
const { finalize } = require('../derive');
const { catIcon } = require('../taxonomy');

const IMPORT_DIR = path.join(__dirname, '..', 'import');

// --- tiny CSV parser (handles quoted fields, commas, CRLF) -------------------
function parseCsv(text) {
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { record.push(field); field = ''; }
    else if (c === '\n') { record.push(field); rows.push(record); field = ''; record = []; }
    else if (c === '\r') { /* ignore */ }
    else field += c;
  }
  if (field.length || record.length) { record.push(field); rows.push(record); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// --- field schemas -----------------------------------------------------------
const NUMERIC = {
  products: ['price', 'revenue', 'units', 'growth', 'commission', 'shops', 'creators', 'rating', 'launchedDaysAgo'],
  creators: ['followers', 'gmv', 'growth', 'videos', 'livestreams', 'avgViews', 'engagement', 'revenuePerVideo'],
  videos: ['views', 'likes', 'comments', 'shares', 'gmv', 'engagement', 'postedDaysAgo'],
  livestreams: ['gmv', 'peakViewers', 'avgViewers', 'durationMin', 'productsSold', 'avgWatchMin', 'daysAgo'],
  shops: ['gmv', 'growth', 'products', 'avgPrice', 'rating', 'followers'],
};
const SERIES = { products: 'revenueSeries', creators: 'gmvSeries', shops: 'gmvSeries' };
const PREFIX = { products: 'P', creators: 'C', videos: 'V', livestreams: 'L', shops: 'S' };
const ICON = { products: null, creators: '🧑‍🎤', videos: '🎬', livestreams: '📡', shops: '🏬' };

function num(v) {
  if (v == null || v === '') return undefined;
  const n = Number(String(v).replace(/[$,%\s]/g, ''));
  return Number.isNaN(n) ? undefined : n;
}

function parseSeries(v) {
  if (Array.isArray(v)) return v.map(Number);
  if (typeof v === 'string' && v.trim()) {
    const t = v.trim();
    try {
      if (t.startsWith('[')) return JSON.parse(t).map(Number);
    } catch (_) { /* fall through */ }
    return t.split(/[|;,]/).map((x) => Number(x)).filter((x) => !Number.isNaN(x));
  }
  return undefined;
}

function normalize(collection, rows) {
  const numeric = NUMERIC[collection] || [];
  const seriesField = SERIES[collection];
  return rows.map((raw, i) => {
    const row = Object.assign({}, raw);
    for (const f of numeric) if (f in row) { const n = num(row[f]); if (n !== undefined) row[f] = n; }
    if (seriesField && row[seriesField] !== undefined) {
      const s = parseSeries(row[seriesField]);
      if (s && s.length) row[seriesField] = s;
    }
    if (!row.id) row.id = `${PREFIX[collection]}${String(i + 1).padStart(4, '0')}`;
    if (!row.icon) row.icon = collection === 'products' ? catIcon(row.category) : ICON[collection];
    return row;
  });
}

function readCollection(name) {
  const jsonPath = path.join(IMPORT_DIR, `${name}.json`);
  const csvPath = path.join(IMPORT_DIR, `${name}.csv`);
  if (fs.existsSync(jsonPath)) {
    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : parsed[name] || [];
  }
  if (fs.existsSync(csvPath)) {
    return parseCsv(fs.readFileSync(csvPath, 'utf8'));
  }
  return [];
}

async function load() {
  if (!fs.existsSync(IMPORT_DIR)) {
    throw new Error(`Import dir not found: ${IMPORT_DIR} (create it and add products.csv etc.)`);
  }
  const collections = ['products', 'creators', 'videos', 'livestreams', 'shops'];
  const db = {};
  let anyRows = 0;
  for (const c of collections) {
    const rows = normalize(c, readCollection(c));
    db[c] = rows;
    anyRows += rows.length;
  }
  if (!anyRows) {
    throw new Error(
      `No data files found in ${IMPORT_DIR}. Add at least products.csv or products.json.`
    );
  }
  return finalize(db, { source: 'file', importedFrom: IMPORT_DIR });
}

module.exports = { load, parseCsv, normalize };
