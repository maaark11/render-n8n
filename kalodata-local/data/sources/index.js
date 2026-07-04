'use strict';

/*
 * Data-source resolver. Pick the source with the DATA_SOURCE env var:
 *
 *   DATA_SOURCE=synthetic   (default) deterministic fake data
 *   DATA_SOURCE=file        load real CSV/JSON from ./data/import/
 *
 * Future adapters (see README "Real data") slot in here the same way:
 *   - tiktok-official : TikTok Shop Open API (your own shop, OAuth)
 *   - provider        : a third-party data API (bring your own key)
 */

const SOURCES = {
  synthetic: () => require('./synthetic'),
  file: () => require('./file'),
};

async function loadData() {
  const name = (process.env.DATA_SOURCE || 'synthetic').toLowerCase();
  const factory = SOURCES[name];
  if (!factory) {
    throw new Error(
      `Unknown DATA_SOURCE "${name}". Available: ${Object.keys(SOURCES).join(', ')}`
    );
  }
  const mod = factory();
  const db = await mod.load();
  db.meta = db.meta || {};
  db.meta.source = db.meta.source || name;
  return db;
}

module.exports = { loadData, SOURCES };
