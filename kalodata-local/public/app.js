'use strict';

/* ============================================================================
 * Kalodata-local frontend SPA
 * Vanilla JS, no framework, no build step. Talks to the local JSON API.
 * ==========================================================================*/

const state = {
  view: 'explore',
  region: 'all',
  range: '7',
  category: 'all',
  trend: 'all',
  minPrice: '',
  maxPrice: '',
  search: '',
  sort: null,
  order: 'desc',
  page: 1,
  pageSize: 25,
};

let META = { categories: [], regions: [] };

// ---------- formatting helpers ----------
const fmtMoney = (n) => '$' + compact(n);
const fmtNum = (n) => compact(n);
function compact(n) {
  n = Number(n) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return Math.round(n / 1e3) + 'K';
  return String(Math.round(n));
}
function delta(g) {
  const cls = g >= 0 ? 'up' : 'down';
  const arrow = g >= 0 ? '▲' : '▼';
  return `<span class="delta ${cls}">${arrow} ${Math.abs(g).toFixed(1)}%</span>`;
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}

// ---------- API ----------
async function api(path, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  const res = await fetch(path + (qs ? '?' + qs : ''));
  if (!res.ok) throw new Error('API ' + res.status);
  return res.json();
}

// ---------- view config ----------
const VIEWS = {
  explore: { title: 'Explore', sub: 'Platform-wide TikTok Shop performance overview' },
  category: { title: 'Category', sub: 'GMV and momentum across product categories' },
  product: {
    title: 'Product',
    sub: 'Trending products ranked by revenue and growth',
    endpoint: '/api/products',
    defaultSort: 'revenue',
    filters: ['category', 'trend', 'price', 'search'],
    columns: [
      colRank(),
      colMain((r) => r.name, (r) => r.category, (r) => r.icon),
      { key: 'price', label: 'Price', sort: 'price', render: (r) => '$' + r.price },
      colTrend('revenue', 'revenueSeries'),
      { key: 'units', label: 'Units Sold', sort: 'units', render: (r) => fmtNum(r.units) },
      { key: 'growth', label: 'Rev. Trend', sort: 'growth', render: (r) => delta(r.growth) },
      { key: 'shops', label: 'Shops', sort: 'shops', render: (r) => fmtNum(r.shops) },
      { key: 'commission', label: 'Comm.', sort: 'commission', render: (r) => r.commission + '%' },
    ],
  },
  creator: {
    title: 'Creator',
    sub: 'Influencers driving TikTok Shop sales',
    endpoint: '/api/creators',
    defaultSort: 'gmv',
    filters: ['category', 'trend', 'search'],
    columns: [
      colRank(),
      colMain((r) => r.handle, (r) => r.category, () => '🧑‍🎤'),
      { key: 'followers', label: 'Followers', sort: 'followers', render: (r) => fmtNum(r.followers) },
      colTrend('gmv', 'gmvSeries'),
      { key: 'growth', label: 'GMV Trend', sort: 'growth', render: (r) => delta(r.growth) },
      { key: 'videos', label: 'Videos', sort: 'videos', render: (r) => fmtNum(r.videos) },
      { key: 'engagement', label: 'Eng. %', sort: 'engagement', render: (r) => r.engagement + '%' },
    ],
  },
  video: {
    title: 'Video',
    sub: 'Short videos indexed by product and sales driven',
    endpoint: '/api/videos',
    defaultSort: 'views',
    filters: ['category', 'search'],
    columns: [
      colRank(),
      colMain((r) => r.title, (r) => r.creator, () => '🎬'),
      { key: 'product', label: 'Product', render: (r) => `<span class="pill cat">${esc(r.product)}</span>` },
      { key: 'views', label: 'Views', sort: 'views', render: (r) => fmtNum(r.views) },
      { key: 'likes', label: 'Likes', sort: 'likes', render: (r) => fmtNum(r.likes) },
      { key: 'gmv', label: 'GMV', sort: 'gmv', render: (r) => fmtMoney(r.gmv) },
      { key: 'engagement', label: 'Eng.%', sort: 'engagement', render: (r) => r.engagement + '%' },
      { key: 'postedDaysAgo', label: 'Posted', sort: 'postedDaysAgo', render: (r) => r.postedDaysAgo + 'd ago' },
    ],
  },
  livestream: {
    title: 'Livestream',
    sub: 'Live sessions ranked by GMV and reach',
    endpoint: '/api/livestreams',
    defaultSort: 'gmv',
    filters: ['category', 'search'],
    columns: [
      colRank(),
      colMain((r) => r.creator, (r) => r.category, () => '📡'),
      { key: 'gmv', label: 'GMV', sort: 'gmv', render: (r) => fmtMoney(r.gmv) },
      { key: 'peakViewers', label: 'Peak Viewers', sort: 'peakViewers', render: (r) => fmtNum(r.peakViewers) },
      { key: 'durationMin', label: 'Duration', sort: 'durationMin', render: (r) => r.durationMin + 'm' },
      { key: 'productsSold', label: 'Products', sort: 'productsSold', render: (r) => r.productsSold },
      { key: 'avgWatchMin', label: 'Avg Watch', sort: 'avgWatchMin', render: (r) => r.avgWatchMin + 'm' },
    ],
  },
  shop: {
    title: 'Shop',
    sub: 'Competitor shops and their sales performance',
    endpoint: '/api/shops',
    defaultSort: 'gmv',
    filters: ['category', 'trend', 'search'],
    columns: [
      colRank(),
      colMain((r) => r.name, (r) => r.category, () => '🏬'),
      colTrend('gmv', 'gmvSeries'),
      { key: 'growth', label: 'GMV Trend', sort: 'growth', render: (r) => delta(r.growth) },
      { key: 'products', label: 'Products', sort: 'products', render: (r) => fmtNum(r.products) },
      { key: 'avgPrice', label: 'Avg Price', sort: 'avgPrice', render: (r) => '$' + r.avgPrice },
      { key: 'followers', label: 'Followers', sort: 'followers', render: (r) => fmtNum(r.followers) },
    ],
  },
};

function colRank() {
  return { key: '_rank', label: '#', render: (r, i) => `<span class="rank">${i}</span>` };
}
function colMain(title, sub, icon) {
  return {
    key: '_main',
    label: 'Name',
    render: (r) =>
      `<div class="cell-main"><span class="cell-ico">${icon(r)}</span>
        <div><div class="cell-title">${esc(title(r))}</div>
        <div class="cell-subtitle">${esc(sub(r))}</div></div></div>`,
  };
}
function colTrend(valueKey, seriesKey) {
  return {
    key: valueKey,
    label: valueKey === 'revenue' ? 'Revenue' : 'GMV',
    sort: valueKey,
    render: (r) =>
      `<div style="display:flex;align-items:center;gap:10px">
        <span class="num" style="font-weight:700;min-width:64px">${fmtMoney(r[valueKey])}</span>
        ${window.Charts.sparkline(sliceRange(r[seriesKey]))}
      </div>`,
  };
}

function sliceRange(series) {
  if (!series) return series;
  const n = state.range === '7' ? 7 : state.range === '30' ? 11 : 14;
  return series.slice(-n);
}

// ---------- DOM refs ----------
const $content = document.getElementById('content');
const $title = document.getElementById('view-title');
const $sub = document.getElementById('view-sub');

// ---------- render dispatch ----------
async function render() {
  const cfg = VIEWS[state.view];
  $title.textContent = cfg.title;
  $sub.textContent = cfg.sub;
  document.querySelectorAll('.nav-item').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === state.view)
  );

  if (state.view === 'explore') { $content.dataset.skeleton = 'explore'; return renderExplore(); }
  if (state.view === 'category') { $content.dataset.skeleton = 'category'; return renderCategory(); }
  return renderTable(cfg);
}

// ---------- Explore (overview dashboard) ----------
async function renderExplore() {
  $content.innerHTML = '<div class="loading">Loading…</div>';
  const o = await api('/api/overview');
  const k = o.kpis;
  const gmvSeries = state.range === '7' ? o.gmvTrend.slice(-7) : o.gmvTrend;

  $content.innerHTML = `
    <div class="kpi-grid">
      ${kpi('Total GMV', fmtMoney(k.totalGmv), delta(k.avgGrowth) + ' avg momentum', '💰')}
      ${kpi('Products Tracked', fmtNum(k.totalProducts), 'across ' + META.categories.length + ' categories', '📦')}
      ${kpi('Creators', fmtNum(k.totalCreators), 'driving sales', '🧑‍🎤')}
      ${kpi('Videos', fmtNum(k.totalVideos), 'indexed', '🎬')}
      ${kpi('Shops', fmtNum(k.totalShops), 'monitored', '🏬')}
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Platform GMV trend <span class="pill">last ${state.range} days</span></h3>
        ${window.Charts.lineChart(gmvSeries)}
      </div>
      <div class="panel">
        <h3>GMV by category</h3>
        ${window.Charts.barList(
          o.categoryBreakdown.slice(0, 7).map((c) => ({ label: c.name, value: c.gmv, icon: c.icon })),
          { fmt: fmtMoney }
        )}
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="panel">
        <h3>🚀 Top movers <span class="pill">fastest growing</span></h3>
        ${o.topMovers
          .map(
            (p) => `<div class="list-row" data-jump="product">
              <span class="cell-ico">${p.icon}</span>
              <div class="grow"><div class="name">${esc(p.name)}</div>
              <div class="cell-subtitle">${esc(p.category)}</div></div>
              ${window.Charts.sparkline(p.revenueSeries.slice(-7))}
              ${delta(p.growth)}</div>`
          )
          .join('')}
      </div>
      <div class="panel">
        <h3>🏆 Top creators <span class="pill">by GMV</span></h3>
        ${window.Charts.barList(
          o.topCreators.map((c) => ({ label: c.handle, value: c.gmv, icon: '🧑‍🎤' })),
          { fmt: fmtMoney }
        )}
      </div>
    </div>`;

  $content.querySelectorAll('[data-jump]').forEach((el) =>
    el.addEventListener('click', () => switchView(el.dataset.jump))
  );
}

function kpi(label, value, foot, icon) {
  return `<div class="kpi">
    <div class="kpi-label">${icon} ${label}</div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-foot muted">${foot}</div>
  </div>`;
}

// ---------- Category cards ----------
async function renderCategory() {
  $content.innerHTML = '<div class="loading">Loading…</div>';
  const { rows } = await api('/api/categories');
  const sorted = [...rows].sort((a, b) => b.gmv - a.gmv);
  $content.innerHTML = `<div class="cat-grid">${sorted
    .map(
      (c) => `<div class="cat-card" data-cat="${esc(c.name)}">
        <div class="cat-head"><span class="cat-ico">${c.icon}</span>
          <div><div class="cell-title">${esc(c.name)}</div>
          <div class="cell-subtitle">${c.products} products · ${c.creators} creators</div></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div><div class="muted" style="font-size:11px">GMV</div>
            <div style="font-size:20px;font-weight:700">${fmtMoney(c.gmv)}</div>
            ${delta(c.growth)}</div>
          ${window.Charts.sparkline(c.gmvSeries, { w: 110, h: 40 })}
        </div>
        <div class="muted" style="font-size:12px;margin-top:10px">Avg price $${c.avgPrice}</div>
      </div>`
    )
    .join('')}</div>`;

  $content.querySelectorAll('[data-cat]').forEach((el) =>
    el.addEventListener('click', () => {
      state.category = el.dataset.cat;
      switchView('product');
    })
  );
}

// ---------- Generic table view ----------
async function renderTable(cfg) {
  // Build the filter bar once per view so typing in search doesn't lose focus.
  const skeletonKey = 'table:' + state.view;
  if ($content.dataset.skeleton !== skeletonKey) {
    $content.innerHTML =
      buildFilterBar(cfg) + '<div class="results"><div class="loading">Loading…</div></div>';
    $content.dataset.skeleton = skeletonKey;
    wireFilterBar(cfg);
  }
  const $results = $content.querySelector('.results');

  const sort = state.sort || cfg.defaultSort;
  const { rows, total, page, pageSize } = await api(cfg.endpoint, {
    region: state.region,
    category: state.category,
    trend: cfg.filters.includes('trend') ? state.trend : '',
    minPrice: cfg.filters.includes('price') ? state.minPrice : '',
    maxPrice: cfg.filters.includes('price') ? state.maxPrice : '',
    search: state.search,
    sort,
    order: state.order,
    page: state.page,
    pageSize: state.pageSize,
  });

  const startIdx = (page - 1) * pageSize;
  const thead = cfg.columns
    .map((c) => {
      const sortable = c.sort ? 'sortable' : '';
      const sorted = c.sort === sort ? 'sorted' : '';
      const arrow = c.sort ? `<span class="arrow">${sorted ? (state.order === 'asc' ? '▲' : '▼') : '↕'}</span>` : '';
      return `<th class="${sortable} ${sorted}" data-sort="${c.sort || ''}">${c.label} ${arrow}</th>`;
    })
    .join('');

  const tbody = rows
    .map(
      (r, i) =>
        `<tr data-id="${r.id}">${cfg.columns
          .map((c) => `<td>${c.render(r, startIdx + i + 1)}</td>`)
          .join('')}</tr>`
    )
    .join('');

  const totalPages = Math.ceil(total / pageSize);
  const table = `
    <div class="table-wrap">
      <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    </div>
    <div class="pager">
      <span>Showing ${startIdx + 1}–${Math.min(startIdx + pageSize, total)} of ${fmtNum(total)}</span>
      <div style="display:flex;gap:8px">
        <button id="prev" ${page <= 1 ? 'disabled' : ''}>← Prev</button>
        <span style="padding:6px 4px">Page ${page} / ${totalPages || 1}</span>
        <button id="next" ${page >= totalPages ? 'disabled' : ''}>Next →</button>
      </div>
    </div>`;

  // Swap only the results area (keeps filter bar & search focus intact).
  $results.innerHTML = table;

  // wire sort headers
  $results.querySelectorAll('th[data-sort]').forEach((th) => {
    if (!th.dataset.sort) return;
    th.addEventListener('click', () => {
      if (state.sort === th.dataset.sort || (!state.sort && th.dataset.sort === cfg.defaultSort)) {
        state.order = state.order === 'asc' ? 'desc' : 'asc';
      } else {
        state.order = 'desc';
      }
      state.sort = th.dataset.sort;
      state.page = 1;
      render();
    });
  });
  // wire pagination
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  if (prev) prev.onclick = () => { state.page--; render(); };
  if (next) next.onclick = () => { state.page++; render(); };
  // row -> drawer
  $results.querySelectorAll('tbody tr').forEach((tr) =>
    tr.addEventListener('click', () => openDrawer(cfg, rows.find((r) => r.id === tr.dataset.id)))
  );

  const count = $content.querySelector('.filter-count');
  if (count) count.textContent = fmtNum(total) + ' results';
}

// ---------- Filter bar ----------
function buildFilterBar(cfg) {
  const parts = [];
  if (cfg.filters.includes('category')) {
    const opts = ['<option value="all">All categories</option>']
      .concat(META.categories.map((c) => `<option value="${esc(c)}" ${state.category === c ? 'selected' : ''}>${esc(c)}</option>`))
      .join('');
    parts.push(`<select id="f-category">${opts}</select>`);
  }
  if (cfg.filters.includes('trend')) {
    parts.push(`<select id="f-trend">
      <option value="all">All trends</option>
      <option value="growing" ${state.trend === 'growing' ? 'selected' : ''}>📈 Growing</option>
      <option value="surging" ${state.trend === 'surging' ? 'selected' : ''}>🚀 Surging (50%+)</option>
      <option value="declining" ${state.trend === 'declining' ? 'selected' : ''}>📉 Declining</option>
    </select>`);
  }
  if (cfg.filters.includes('price')) {
    parts.push(`<input id="f-min" type="number" placeholder="Min $" style="width:90px" value="${state.minPrice}"/>`);
    parts.push(`<input id="f-max" type="number" placeholder="Max $" style="width:90px" value="${state.maxPrice}"/>`);
  }
  if (cfg.filters.includes('search')) {
    parts.push(`<input id="f-search" class="search" type="text" placeholder="Search…" value="${esc(state.search)}"/>`);
  }
  parts.push('<span class="filter-count"></span>');
  return `<div class="filterbar">${parts.join('')}</div>`;
}

function wireFilterBar(cfg) {
  const cat = document.getElementById('f-category');
  if (cat) cat.onchange = () => { state.category = cat.value; state.page = 1; render(); };
  const tr = document.getElementById('f-trend');
  if (tr) tr.onchange = () => { state.trend = tr.value; state.page = 1; render(); };
  const mn = document.getElementById('f-min');
  const mx = document.getElementById('f-max');
  if (mn) mn.onchange = () => { state.minPrice = mn.value; state.page = 1; render(); };
  if (mx) mx.onchange = () => { state.maxPrice = mx.value; state.page = 1; render(); };
  const s = document.getElementById('f-search');
  if (s) {
    let t;
    s.oninput = () => {
      clearTimeout(t);
      t = setTimeout(() => { state.search = s.value; state.page = 1; render(); }, 300);
    };
  }
}

// ---------- Drawer ----------
function openDrawer(cfg, row) {
  if (!row) return;
  const body = document.getElementById('drawer-body');
  const series = row.revenueSeries || row.gmvSeries;
  const title = row.name || row.handle || row.creator || row.title;
  const subtitle = row.category || row.product || '';
  const icon = row.icon || '📊';

  const stats = drawerStats(cfg.title, row);
  body.innerHTML = `
    <div class="drawer-hero">
      <span class="cell-ico">${icon}</span>
      <div><div style="font-size:18px;font-weight:700">${esc(title)}</div>
      <div class="muted">${esc(subtitle)} · ${row.region || ''}</div></div>
    </div>
    ${series ? `<div class="panel" style="margin:0 0 16px">
      <h3>Trend <span class="pill">${row.growth != null ? (row.growth >= 0 ? '▲ ' : '▼ ') + Math.abs(row.growth) + '%' : ''}</span></h3>
      ${window.Charts.lineChart(series, { h: 140 })}</div>` : ''}
    <div class="drawer-stats">${stats}</div>
    <div class="muted" style="font-size:12px;margin-top:8px">ID ${row.id} · synthetic record</div>`;
  document.getElementById('drawer').hidden = false;
  document.getElementById('drawer-backdrop').hidden = false;
}

function drawerStat(l, v) {
  return `<div class="drawer-stat"><div class="l">${l}</div><div class="v">${v}</div></div>`;
}
function drawerStats(view, r) {
  const S = [];
  if (r.revenue != null) S.push(drawerStat('Revenue', fmtMoney(r.revenue)));
  if (r.gmv != null) S.push(drawerStat('GMV', fmtMoney(r.gmv)));
  if (r.price != null) S.push(drawerStat('Price', '$' + r.price));
  if (r.units != null) S.push(drawerStat('Units Sold', fmtNum(r.units)));
  if (r.followers != null) S.push(drawerStat('Followers', fmtNum(r.followers)));
  if (r.views != null) S.push(drawerStat('Views', fmtNum(r.views)));
  if (r.likes != null) S.push(drawerStat('Likes', fmtNum(r.likes)));
  if (r.peakViewers != null) S.push(drawerStat('Peak Viewers', fmtNum(r.peakViewers)));
  if (r.productsSold != null) S.push(drawerStat('Products Sold', r.productsSold));
  if (r.durationMin != null) S.push(drawerStat('Duration', r.durationMin + ' min'));
  if (r.videos != null) S.push(drawerStat('Videos', fmtNum(r.videos)));
  if (r.engagement != null) S.push(drawerStat('Engagement', r.engagement + '%'));
  if (r.commission != null) S.push(drawerStat('Commission', r.commission + '%'));
  if (r.shops != null) S.push(drawerStat('Competing Shops', fmtNum(r.shops)));
  if (r.products != null) S.push(drawerStat('Products', fmtNum(r.products)));
  if (r.avgPrice != null) S.push(drawerStat('Avg Price', '$' + r.avgPrice));
  return S.slice(0, 8).join('');
}

function closeDrawer() {
  document.getElementById('drawer').hidden = true;
  document.getElementById('drawer-backdrop').hidden = true;
}

// ---------- navigation ----------
function switchView(view) {
  state.view = view;
  state.sort = null;
  state.order = 'desc';
  state.trend = 'all';
  state.search = '';
  state.minPrice = '';
  state.maxPrice = '';
  state.page = 1;
  // keep state.category when jumping from category cards; reset otherwise handled by caller
  render();
}

// ---------- boot ----------
async function boot() {
  try {
    META = await api('/api/meta');
  } catch (e) {
    META = { categories: [], regions: [] };
  }
  document.getElementById('seed').textContent = META.seed || '—';
  const rsel = document.getElementById('region-global');
  META.regions.forEach((r) => {
    const o = document.createElement('option');
    o.value = r;
    o.textContent = r;
    rsel.appendChild(o);
  });
  rsel.onchange = () => { state.region = rsel.value; state.page = 1; render(); };

  document.querySelectorAll('.nav-item').forEach((b) =>
    b.addEventListener('click', () => {
      state.category = 'all';
      switchView(b.dataset.view);
    })
  );

  document.querySelectorAll('#date-pill button').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('#date-pill button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      state.range = b.dataset.range;
      render();
    })
  );

  document.getElementById('drawer-close').onclick = closeDrawer;
  document.getElementById('drawer-backdrop').onclick = closeDrawer;

  render();
}

boot();
