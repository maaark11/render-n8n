'use strict';

/*
 * Kalodata-local — zero-dependency Node server.
 *
 * Uses ONLY Node built-ins (http, fs, path, url), so it runs anywhere Node is
 * installed with a single command and no `npm install`:
 *
 *     node server.js
 *
 * It serves the static frontend from ./public and a small JSON API backed by
 * the deterministic synthetic dataset in ./data/generate.js.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { loadData } = require('./data/sources');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

// Dataset is loaded from the configured source at boot (see data/sources).
let DB = null;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// --- Generic query engine -----------------------------------------------------
function applyQuery(rows, q, opts = {}) {
  const {
    searchable = ['name', 'title', 'handle'],
    numericFilters = ['minPrice:price:gte', 'maxPrice:price:lte'],
  } = opts;

  let out = rows;

  // Exact-match string filters shared by most collections.
  for (const key of ['category', 'region']) {
    if (q[key] && q[key] !== 'all') {
      out = out.filter((r) => r[key] === q[key]);
    }
  }

  // Trend filter: growing / declining (based on `growth`).
  if (q.trend && q.trend !== 'all') {
    if (q.trend === 'growing') out = out.filter((r) => (r.growth ?? 0) > 0);
    if (q.trend === 'declining') out = out.filter((r) => (r.growth ?? 0) < 0);
    if (q.trend === 'surging') out = out.filter((r) => (r.growth ?? 0) >= 50);
  }

  // Numeric range filters, e.g. "minPrice:price:gte".
  for (const spec of numericFilters) {
    const [param, field, op] = spec.split(':');
    if (q[param] !== undefined && q[param] !== '') {
      const val = Number(q[param]);
      if (!Number.isNaN(val)) {
        out = out.filter((r) => {
          const rv = Number(r[field]);
          return op === 'gte' ? rv >= val : rv <= val;
        });
      }
    }
  }

  // Free-text search.
  if (q.search) {
    const needle = q.search.toLowerCase();
    out = out.filter((r) =>
      searchable.some(
        (f) => r[f] && String(r[f]).toLowerCase().includes(needle)
      )
    );
  }

  // Sort.
  if (q.sort) {
    const dir = q.order === 'asc' ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = a[q.sort];
      const bv = b[q.sort];
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  const total = out.length;
  const page = Math.max(1, parseInt(q.page || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '25', 10)));
  const start = (page - 1) * pageSize;
  const rowsPage = out.slice(start, start + pageSize);

  return { rows: rowsPage, total, page, pageSize };
}

function sendJson(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

// --- Static file serving ------------------------------------------------------
function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  // Prevent path traversal.
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// --- API routing --------------------------------------------------------------
function handleApi(req, res, pathname, q) {
  switch (pathname) {
    case '/api/overview':
      return sendJson(res, DB.overview);
    case '/api/meta':
      return sendJson(res, DB.meta);
    case '/api/products':
      return sendJson(
        res,
        applyQuery(DB.products, q, { searchable: ['name', 'category'] })
      );
    case '/api/creators':
      return sendJson(
        res,
        applyQuery(DB.creators, q, {
          searchable: ['handle', 'category'],
          numericFilters: ['minFollowers:followers:gte'],
        })
      );
    case '/api/videos':
      return sendJson(
        res,
        applyQuery(DB.videos, q, { searchable: ['title', 'creator', 'product'] })
      );
    case '/api/livestreams':
      return sendJson(
        res,
        applyQuery(DB.livestreams, q, { searchable: ['creator', 'topProduct'] })
      );
    case '/api/shops':
      return sendJson(
        res,
        applyQuery(DB.shops, q, { searchable: ['name', 'category'] })
      );
    case '/api/categories':
      return sendJson(res, { rows: DB.categories, total: DB.categories.length });
    case '/api/health':
      return sendJson(res, { ok: true, seed: DB.meta.seed });
    default:
      return sendJson(res, { error: 'Unknown endpoint' }, 404);
  }
}

// --- Server -------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsed.pathname;
  const q = Object.fromEntries(parsed.searchParams.entries());

  if (pathname.startsWith('/api/')) {
    if (!DB) return sendJson(res, { error: 'Dataset still loading' }, 503);
    try {
      return handleApi(req, res, pathname, q);
    } catch (err) {
      return sendJson(res, { error: String(err) }, 500);
    }
  }
  return serveStatic(req, res, pathname);
});

(async function boot() {
  const source = process.env.DATA_SOURCE || 'synthetic';
  try {
    DB = await loadData();
  } catch (err) {
    console.error(`[kalodata-local] failed to load data source "${source}":`, err.message);
    process.exit(1);
  }
  console.log(
    `[kalodata-local] data source: ${DB.meta.source} — ${DB.products.length} products, ` +
      `${DB.creators.length} creators, ${DB.videos.length} videos, ` +
      `${DB.livestreams.length} livestreams, ${DB.shops.length} shops`
  );
  server.listen(PORT, HOST, () => {
    console.log(`\n  ▶ Kalodata-local running at  http://localhost:${PORT}\n`);
  });
})();
