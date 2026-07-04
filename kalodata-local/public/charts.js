'use strict';

/*
 * Tiny hand-rolled SVG charting — no external libraries, works fully offline.
 * Each function returns an SVG string you can drop into innerHTML.
 */
window.Charts = (function () {
  const ACCENT = '#6c5ce7';
  const ACCENT2 = '#00d1b2';
  const UP = '#22c55e';
  const DOWN = '#ef4444';

  function scale(values, w, h, pad = 4) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values.map((v, i) => {
      const x = pad + (i / (values.length - 1 || 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return [x, y];
    });
  }

  function sparkline(values, opts = {}) {
    const w = opts.w || 90;
    const h = opts.h || 28;
    if (!values || values.length < 2) return '';
    const pts = scale(values, w, h);
    const up = values[values.length - 1] >= values[0];
    const color = opts.color || (up ? UP : DOWN);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area =
      d +
      ` L ${pts[pts.length - 1][0].toFixed(1)} ${h} L ${pts[0][0].toFixed(1)} ${h} Z`;
    const id = 'sg' + Math.floor(values.reduce((a, b) => a + b, 0) % 100000);
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity="0.35"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#${id})"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function lineChart(values, opts = {}) {
    const w = opts.w || 640;
    const h = opts.h || 220;
    const padL = 6;
    const padB = 6;
    if (!values || values.length < 2) return '';
    const pts = scale(values, w, h, 10);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = d + ` L ${pts[pts.length - 1][0].toFixed(1)} ${h - padB} L ${pts[0][0].toFixed(1)} ${h - padB} Z`;
    // horizontal gridlines
    let grid = '';
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      grid += `<line x1="0" x2="${w}" y1="${y}" y2="${y}" stroke="#262b40" stroke-width="1"/>`;
    }
    const dots = pts
      .map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.2" fill="${ACCENT2}"/>`)
      .join('');
    return `<svg class="chart" width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="lc" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.4"/>
        <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}
      <path d="${area}" fill="url(#lc)"/>
      <path d="${d}" fill="none" stroke="${ACCENT}" stroke-width="2.4" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
  }

  function barList(items, opts = {}) {
    // items: [{label, value, icon}]
    const max = Math.max(...items.map((i) => i.value)) || 1;
    return items
      .map((it) => {
        const pct = Math.max(3, (it.value / max) * 100);
        return `<div class="list-row">
          <span class="cell-ico">${it.icon || '•'}</span>
          <div class="grow">
            <div class="name">${it.label}</div>
            <div style="height:6px;background:#222741;border-radius:6px;margin-top:6px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${ACCENT},${ACCENT2})"></div>
            </div>
          </div>
          <div class="num" style="font-weight:700">${opts.fmt ? opts.fmt(it.value) : it.value}</div>
        </div>`;
      })
      .join('');
  }

  return { sparkline, lineChart, barList };
})();
