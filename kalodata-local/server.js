'use strict';

/*
 * Kalodata-style TikTok Shop analytics — LOCAL DEMO
 *
 * Zero external dependencies. Uses only Node's built-in modules so it runs
 * with a plain `node server.js` on any machine with Node 16+ installed.
 *
 * All data is synthetic (see lib/data.js). Nothing is fetched from the real
 * kalodata.com or from TikTok. This is an original reconstruction of the
 * *concept* for local experimentation.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const data = require('./lib/data');

const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---- Demo auth -----------------------------------------------------------
// Purely a UX stand-in. Any email + password works, or the demo account.
// A "token" is just a signed-ish opaque string; there is no real security
// here because there is no real data to protect.
const DEMO_TOKEN = 'demo-session-token';

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (_e) {
        resolve({});
      }
    });
  });
}

function requireAuth(req) {
  const auth = req.headers['authorization'] || '';
  return auth === 'Bearer ' + DEMO_TOKEN;
}

// ---- Generic collection query (filter/search/sort/paginate) --------------

function queryCollection(rows, q) {
  let out = rows;

  if (q.category && q.category !== 'all') {
    out = out.filter((r) => r.category === q.category);
  }
  if (q.region && q.region !== 'all') {
    out = out.filter((r) => r.region === q.region);
  }
  if (q.search) {
    const needle = String(q.search).toLowerCase();
    out = out.filter((r) =>
      Object.values(r).some(
        (v) => typeof v === 'string' && v.toLowerCase().includes(needle)
      )
    );
  }

  const total = out.length;

  if (q.sort) {
    const key = q.sort;
    const dir = q.order === 'asc' ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  const page = Math.max(1, parseInt(q.page || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '20', 10)));
  const start = (page - 1) * pageSize;
  const items = out.slice(start, start + pageSize).map(stripTrend);

  return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}

// Keep list payloads light; trends are fetched per-entity on drilldown.
function stripTrend(row) {
  const { trend, ...rest } = row;
  return rest;
}

function findById(rows, id) {
  return rows.find((r) => r.id === id);
}

// ---- Static file serving -------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      // SPA fallback: unknown non-API path -> index.html
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, idx) => {
        if (e2) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(idx);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

// ---- Router --------------------------------------------------------------

const COLLECTIONS = {
  products: data.products,
  creators: data.creators,
  videos: data.videos,
  livestreams: data.livestreams,
  shops: data.shops,
};

async function handleApi(req, res, pathname, query) {
  // Auth
  if (pathname === '/api/login' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.email) return json(res, 400, { error: 'email required' });
    return json(res, 200, {
      token: DEMO_TOKEN,
      user: { email: body.email, name: body.email.split('@')[0], plan: 'Demo' },
    });
  }

  if (pathname === '/api/meta') {
    return json(res, 200, {
      categories: data.CATEGORIES,
      regions: data.REGIONS,
    });
  }

  // Everything below requires the demo token.
  if (!requireAuth(req)) return json(res, 401, { error: 'unauthorized' });

  if (pathname === '/api/overview') {
    return json(res, 200, data.overview());
  }

  // /api/:collection  and  /api/:collection/:id
  const m = pathname.match(/^\/api\/([a-z]+)(?:\/([a-z0-9_]+))?$/);
  if (m) {
    const rows = COLLECTIONS[m[1]];
    if (!rows) return json(res, 404, { error: 'unknown collection' });
    if (m[2]) {
      const item = findById(rows, m[2]);
      if (!item) return json(res, 404, { error: 'not found' });
      return json(res, 200, item);
    }
    return json(res, 200, queryCollection(rows, query));
  }

  return json(res, 404, { error: 'unknown endpoint' });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname, parsed.query).catch((err) => {
      json(res, 500, { error: 'server error', detail: String(err && err.message) });
    });
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────┐');
  console.log('  │  Kalodata-style Analytics — LOCAL DEMO            │');
  console.log('  │  (synthetic data · no external calls)            │');
  console.log('  └─────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  ▸ Dashboard:  ${url}`);
  console.log(`  ▸ Login:      any email + any password (or click "Use demo account")`);
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
