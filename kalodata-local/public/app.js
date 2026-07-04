'use strict';

/* Kalo Local — front-end SPA. Vanilla JS, no build step, no CDN. */

// ---- State ---------------------------------------------------------------
const state = {
  token: localStorage.getItem('kalo_token') || null,
  user: JSON.parse(localStorage.getItem('kalo_user') || 'null'),
  view: 'overview',
  meta: { categories: [], regions: [] },
  filters: { category: 'all', region: 'all', search: '' },
  sort: {},          // per-view { key, order }
  page: 1,
};

const el = (sel) => document.querySelector(sel);
const create = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

// ---- Formatting ----------------------------------------------------------
function fmtNum(n) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
function fmtMoney(n) { return '$' + fmtNum(n); }
function fmtPct(n) {
  if (n == null) return '—';
  const cls = n >= 0 ? 'up' : 'down';
  const sign = n >= 0 ? '▲' : '▼';
  return `<span class="${cls}">${sign} ${Math.abs(n).toFixed(1)}%</span>`;
}

// ---- API -----------------------------------------------------------------
async function api(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(path, Object.assign({}, opts, { headers }));
  if (res.status === 401) { logout(); throw new Error('unauthorized'); }
  if (!res.ok) throw new Error('request failed: ' + res.status);
  return res.json();
}

// ---- Auth ----------------------------------------------------------------
async function login(email, password) {
  const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  state.token = r.token;
  state.user = r.user;
  localStorage.setItem('kalo_token', r.token);
  localStorage.setItem('kalo_user', JSON.stringify(r.user));
  await boot();
}
function logout() {
  state.token = null; state.user = null;
  localStorage.removeItem('kalo_token');
  localStorage.removeItem('kalo_user');
  el('#app').classList.add('hidden');
  el('#login').classList.remove('hidden');
}

// ---- SVG charts ----------------------------------------------------------
function sparkline(trend, color) {
  color = color || 'var(--accent)';
  const w = 120, h = 48, pad = 2;
  const max = Math.max(...trend, 1), min = Math.min(...trend);
  const span = max - min || 1;
  const step = (w - pad * 2) / (trend.length - 1);
  const pts = trend.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function lineChart(trend, label) {
  const w = 480, h = 220, padL = 44, padB = 24, padT = 12, padR = 12;
  const max = Math.max(...trend, 1), min = Math.min(...trend, 0);
  const span = max - min || 1;
  const iw = w - padL - padR, ih = h - padT - padB;
  const step = iw / (trend.length - 1);
  const pts = trend.map((v, i) => {
    const x = padL + i * step;
    const y = padT + ih - ((v - min) / span) * ih;
    return [x, y];
  });
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `${padL},${padT + ih} ${line} ${padL + iw},${padT + ih}`;
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const y = padT + ih - f * ih;
    const val = min + f * span;
    return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="var(--border)" stroke-width="1"/>
            <text class="chart-axis" x="${padL - 6}" y="${y + 3}" text-anchor="end">${fmtNum(Math.round(val))}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="ag" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="var(--accent)" stop-opacity="0.28"/>
      <stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
    </linearGradient></defs>
    ${gridY}
    <polygon points="${area}" fill="url(#ag)"/>
    <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
    <text class="chart-axis" x="${padL}" y="${h - 6}">30 days ago</text>
    <text class="chart-axis" x="${w - padR}" y="${h - 6}" text-anchor="end">today</text>
  </svg>`;
}

// ---- Column definitions --------------------------------------------------
const VIEWS = {
  overview: { title: 'Overview' },
  products: {
    title: 'Products',
    endpoint: 'products',
    defaultSort: { key: 'revenue', order: 'desc' },
    main: (r) => `<div class="cell-main">${r.name}</div><div class="cell-sub">${r.shopName}</div>`,
    columns: [
      { key: 'category', label: 'Category', render: (r) => `<span class="pill">${r.category}</span>` },
      { key: 'region', label: 'Region' },
      { key: 'price', label: 'Price', num: true, render: (r) => fmtMoney(r.price) },
      { key: 'revenue', label: 'Revenue', num: true, render: (r) => fmtMoney(r.revenue) },
      { key: 'unitsSold', label: 'Units', num: true, render: (r) => fmtNum(r.unitsSold) },
      { key: 'commissionRate', label: 'Comm.', num: true, render: (r) => r.commissionRate + '%' },
      { key: 'growthRate', label: 'Growth', num: true, render: (r) => fmtPct(r.growthRate) },
    ],
  },
  creators: {
    title: 'Creators',
    endpoint: 'creators',
    defaultSort: { key: 'revenue', order: 'desc' },
    main: (r) => `<div class="cell-main">${r.handle}</div><div class="cell-sub">${r.category}</div>`,
    columns: [
      { key: 'region', label: 'Region' },
      { key: 'followers', label: 'Followers', num: true, render: (r) => fmtNum(r.followers) },
      { key: 'revenue', label: 'Revenue', num: true, render: (r) => fmtMoney(r.revenue) },
      { key: 'videosCount', label: 'Videos', num: true, render: (r) => fmtNum(r.videosCount) },
      { key: 'engagementRate', label: 'Engmt', num: true, render: (r) => r.engagementRate + '%' },
      { key: 'gpm', label: 'GPM', num: true, render: (r) => fmtMoney(r.gpm) },
      { key: 'growthRate', label: 'Growth', num: true, render: (r) => fmtPct(r.growthRate) },
    ],
  },
  videos: {
    title: 'Videos',
    endpoint: 'videos',
    defaultSort: { key: 'views', order: 'desc' },
    main: (r) => `<div class="cell-main">${r.title}</div><div class="cell-sub">${r.creatorHandle} · ${r.productName}</div>`,
    columns: [
      { key: 'category', label: 'Category', render: (r) => `<span class="pill">${r.category}</span>` },
      { key: 'views', label: 'Views', num: true, render: (r) => fmtNum(r.views) },
      { key: 'revenue', label: 'Revenue', num: true, render: (r) => fmtMoney(r.revenue) },
      { key: 'likes', label: 'Likes', num: true, render: (r) => fmtNum(r.likes) },
      { key: 'engagementRate', label: 'Engmt', num: true, render: (r) => r.engagementRate + '%' },
      { key: 'gpm', label: 'GPM', num: true, render: (r) => fmtMoney(r.gpm) },
    ],
  },
  livestreams: {
    title: 'Livestreams',
    endpoint: 'livestreams',
    defaultSort: { key: 'revenue', order: 'desc' },
    main: (r) => `<div class="cell-main">${r.title}</div><div class="cell-sub">${r.creatorHandle}</div>`,
    columns: [
      { key: 'category', label: 'Category', render: (r) => `<span class="pill">${r.category}</span>` },
      { key: 'revenue', label: 'Revenue', num: true, render: (r) => fmtMoney(r.revenue) },
      { key: 'viewers', label: 'Viewers', num: true, render: (r) => fmtNum(r.viewers) },
      { key: 'itemsSold', label: 'Items', num: true, render: (r) => fmtNum(r.itemsSold) },
      { key: 'durationMin', label: 'Duration', num: true, render: (r) => r.durationMin + 'm' },
      { key: 'gpm', label: 'GPM', num: true, render: (r) => fmtMoney(r.gpm) },
    ],
  },
  shops: {
    title: 'Shops',
    endpoint: 'shops',
    defaultSort: { key: 'revenue', order: 'desc' },
    main: (r) => `<div class="cell-main">${r.name}</div><div class="cell-sub">${r.category}</div>`,
    columns: [
      { key: 'region', label: 'Region' },
      { key: 'revenue', label: 'Revenue', num: true, render: (r) => fmtMoney(r.revenue) },
      { key: 'productCount', label: 'Products', num: true, render: (r) => fmtNum(r.productCount) },
      { key: 'followers', label: 'Followers', num: true, render: (r) => fmtNum(r.followers) },
      { key: 'rating', label: 'Rating', num: true, render: (r) => '★ ' + r.rating },
      { key: 'growthRate', label: 'Growth', num: true, render: (r) => fmtPct(r.growthRate) },
    ],
  },
};

// ---- Rendering: overview -------------------------------------------------
async function renderOverview() {
  const view = el('#view');
  view.innerHTML = '<div class="loading">Loading…</div>';
  const o = await api('/api/overview');
  const k = o.kpis;

  const kpis = [
    ['Total Revenue', fmtMoney(k.totalRevenue), 'tracked GMV proxy'],
    ['Units Sold', fmtNum(k.totalUnits), 'across all products'],
    ['Products', fmtNum(k.trackedProducts), 'tracked'],
    ['Creators', fmtNum(k.trackedCreators), 'tracked'],
    ['Videos', fmtNum(k.trackedVideos), 'tracked'],
    ['Avg Commission', k.avgCommission + '%', 'weighted'],
  ].map(([l, v, s]) => `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join('');

  const maxCat = Math.max(...o.topCategories.map((c) => c.revenue));
  const catBars = o.topCategories.slice(0, 8).map((c) => `
    <div class="bar-row">
      <span class="bname">${c.category}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(c.revenue / maxCat * 100).toFixed(1)}%"></span></span>
      <span class="bval">${fmtMoney(c.revenue)}</span>
    </div>`).join('');

  const maxReg = Math.max(...o.byRegion.map((r) => r.revenue));
  const regBars = o.byRegion.map((r) => `
    <div class="bar-row">
      <span class="bname">${r.region}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(r.revenue / maxReg * 100).toFixed(1)}%"></span></span>
      <span class="bval">${fmtMoney(r.revenue)}</span>
    </div>`).join('');

  const topProdRows = o.topProducts.map((p, i) => `
    <tr data-col="products" data-id="${p.id}">
      <td class="rank">${i + 1}</td><td>${p.name}</td>
      <td class="num">${fmtMoney(p.revenue)}</td><td class="num">${fmtPct(p.growthRate)}</td>
    </tr>`).join('');

  view.innerHTML = `
    <div class="kpi-grid">${kpis}</div>
    <div class="panels">
      <div class="panel">
        <h3>Platform revenue · last 30 days</h3>
        ${lineChart(o.revenueTrend)}
      </div>
      <div class="panel">
        <h3>Revenue by region</h3>
        ${regBars}
      </div>
    </div>
    <div class="panels">
      <div class="panel">
        <h3>Top categories</h3>
        ${catBars}
      </div>
      <div class="panel">
        <h3>Top products</h3>
        <table><tbody>${topProdRows}</tbody></table>
      </div>
    </div>`;

  view.querySelectorAll('tr[data-id]').forEach((tr) => {
    tr.addEventListener('click', () => openDrawer(tr.dataset.col, tr.dataset.id));
  });
}

// ---- Rendering: collection tables ----------------------------------------
async function renderCollection(viewName) {
  const cfg = VIEWS[viewName];
  const view = el('#view');
  view.innerHTML = '<div class="loading">Loading…</div>';

  const sort = state.sort[viewName] || cfg.defaultSort;
  state.sort[viewName] = sort;

  const params = new URLSearchParams({
    category: state.filters.category,
    region: state.filters.region,
    search: state.filters.search,
    sort: sort.key,
    order: sort.order,
    page: String(state.page),
    pageSize: '20',
  });
  const data = await api(`/api/${cfg.endpoint}?` + params.toString());

  const headCols = cfg.columns.map((c) => {
    const active = sort.key === c.key ? (sort.order === 'desc' ? ' ▾' : ' ▴') : '';
    return `<th class="${c.num ? 'num' : ''}" data-key="${c.key}">${c.label}${active}</th>`;
  }).join('');

  const rows = data.items.map((r, i) => {
    const rank = (data.page - 1) * data.pageSize + i + 1;
    const cells = cfg.columns.map((c) => `<td class="${c.num ? 'num' : ''}">${c.render ? c.render(r) : r[c.key]}</td>`).join('');
    return `<tr data-id="${r.id}"><td class="rank">${rank}</td><td>${cfg.main(r)}</td>${cells}</tr>`;
  }).join('');

  view.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Name</th>${headCols}</tr></thead>
        <tbody>${rows || `<tr><td colspan="99" class="empty">No results</td></tr>`}</tbody>
      </table>
      <div class="pager">
        <span>${data.total.toLocaleString()} results · page ${data.page} of ${data.pages || 1}</span>
        <span>
          <button id="prev" ${data.page <= 1 ? 'disabled' : ''}>← Prev</button>
          <button id="next" ${data.page >= data.pages ? 'disabled' : ''}>Next →</button>
        </span>
      </div>
    </div>`;

  view.querySelectorAll('thead th[data-key]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      const cur = state.sort[viewName];
      state.sort[viewName] = { key, order: cur.key === key && cur.order === 'desc' ? 'asc' : 'desc' };
      state.page = 1;
      renderCollection(viewName);
    });
  });
  view.querySelectorAll('tbody tr[data-id]').forEach((tr) => {
    tr.addEventListener('click', () => openDrawer(cfg.endpoint, tr.dataset.id));
  });
  const prev = el('#prev'), next = el('#next');
  if (prev) prev.addEventListener('click', () => { state.page--; renderCollection(viewName); });
  if (next) next.addEventListener('click', () => { state.page++; renderCollection(viewName); });
}

// ---- Drilldown drawer ----------------------------------------------------
async function openDrawer(collection, id) {
  const body = el('#drawer-body');
  el('#drawer').classList.remove('hidden');
  body.innerHTML = '<div class="loading">Loading…</div>';
  const r = await api(`/api/${collection}/${id}`);

  const title = r.name || r.handle || r.title;
  const sub = [r.category, r.region].filter(Boolean).join(' · ');

  const statOrder = {
    products: [['Revenue', fmtMoney(r.revenue)], ['Units Sold', fmtNum(r.unitsSold)], ['Price', fmtMoney(r.price)], ['GMV', fmtMoney(r.gmv)], ['Commission', r.commissionRate + '%'], ['Rating', '★ ' + r.rating], ['Creators', fmtNum(r.creatorsCount)], ['Videos', fmtNum(r.videosCount)]],
    creators: [['Revenue', fmtMoney(r.revenue)], ['Followers', fmtNum(r.followers)], ['Videos', fmtNum(r.videosCount)], ['Avg Views', fmtNum(r.avgViews)], ['Engagement', r.engagementRate + '%'], ['GPM', fmtMoney(r.gpm)]],
    videos: [['Views', fmtNum(r.views)], ['Revenue', fmtMoney(r.revenue)], ['Likes', fmtNum(r.likes)], ['Comments', fmtNum(r.comments)], ['Shares', fmtNum(r.shares)], ['Engagement', r.engagementRate + '%']],
    livestreams: [['Revenue', fmtMoney(r.revenue)], ['Viewers', fmtNum(r.viewers)], ['Peak', fmtNum(r.peakViewers)], ['Items Sold', fmtNum(r.itemsSold)], ['Duration', r.durationMin + 'm'], ['Avg Watch', r.avgWatchMin + 'm']],
    shops: [['Revenue', fmtMoney(r.revenue)], ['Products', fmtNum(r.productCount)], ['Followers', fmtNum(r.followers)], ['Rating', '★ ' + r.rating], ['Growth', (r.growthRate) + '%']],
  }[collection] || [];

  const stats = statOrder.map(([l, v]) => `<div class="stat"><div class="label">${l}</div><div class="value">${v}</div></div>`).join('');
  const topProducts = r.topProducts && r.topProducts.length
    ? `<h3 style="margin-top:20px">Top products</h3><div class="tag-list">${r.topProducts.map((p) => `<span class="pill">${p}</span>`).join('')}</div>` : '';

  const trendLabel = collection === 'videos' ? 'Views' : 'Revenue';
  body.innerHTML = `
    <h2>${title}</h2>
    <div class="dsub">${sub}${r.growthRate != null ? ' · ' + fmtPct(r.growthRate) : ''}</div>
    <div class="panel" style="padding:14px;background:var(--bg-2)">
      <h3 style="margin-bottom:8px">${trendLabel} · last 30 days</h3>
      ${r.trend ? lineChart(r.trend, trendLabel) : '<div class="empty">No trend</div>'}
    </div>
    <div class="stat-grid">${stats}</div>
    ${topProducts}`;
}
function closeDrawer() { el('#drawer').classList.add('hidden'); }

// ---- View switching ------------------------------------------------------
function setView(name) {
  state.view = name;
  state.page = 1;
  el('#view-title').textContent = VIEWS[name].title;
  document.querySelectorAll('.nav-item[data-view]').forEach((n) =>
    n.classList.toggle('active', n.dataset.view === name));
  // Filters only apply to collection views.
  const showFilters = name !== 'overview';
  el('.filters').style.visibility = showFilters ? 'visible' : 'hidden';
  if (name === 'overview') renderOverview();
  else renderCollection(name);
}

// ---- Filters -------------------------------------------------------------
let searchTimer = null;
function wireFilters() {
  const cat = el('#f-category'), reg = el('#f-region'), search = el('#f-search');
  cat.innerHTML = '<option value="all">All categories</option>' +
    state.meta.categories.map((c) => `<option>${c}</option>`).join('');
  reg.innerHTML = '<option value="all">All regions</option>' +
    state.meta.regions.map((r) => `<option value="${r.code}">${r.code} · ${r.name}</option>`).join('');

  cat.addEventListener('change', () => { state.filters.category = cat.value; state.page = 1; refresh(); });
  reg.addEventListener('change', () => { state.filters.region = reg.value; state.page = 1; refresh(); });
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.filters.search = search.value.trim(); state.page = 1; refresh(); }, 250);
  });
}
function refresh() {
  if (state.view === 'overview') renderOverview();
  else renderCollection(state.view);
}

// ---- Boot ----------------------------------------------------------------
async function boot() {
  el('#login').classList.add('hidden');
  el('#app').classList.remove('hidden');
  el('#user-chip').innerHTML = `<b>${state.user.name}</b>${state.user.email}<br><span class="pill">${state.user.plan} plan</span>`;
  state.meta = await api('/api/meta');
  wireFilters();
  setView('overview');
}

// ---- Wire up -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  el('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await login(el('#email').value, el('#password').value); }
    catch (err) { alert('Login failed: ' + err.message); }
  });
  el('#demo-btn').addEventListener('click', async () => {
    try { await login('demo@kalolocal.dev', 'demo'); }
    catch (err) { alert('Login failed: ' + err.message); }
  });
  el('#logout').addEventListener('click', logout);
  document.querySelectorAll('.nav-item[data-view]').forEach((n) =>
    n.addEventListener('click', () => setView(n.dataset.view)));
  el('#drawer-close').addEventListener('click', closeDrawer);
  el('#drawer-scrim').addEventListener('click', closeDrawer);

  // Auto-resume session if token present.
  if (state.token && state.user) boot().catch(() => logout());
});
