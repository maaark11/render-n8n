'use strict';

/*
 * Data-source resolver. Pick the source with the DATA_SOURCE env var:
 *
 *   DATA_SOURCE=synthetic   (default) deterministic fake data
 *   DATA_SOURCE=file        load real CSV/JSON from ./data/import/
 *   DATA_SOURCE=provider    pull from a third-party data API (see PROVIDER=…)
 */

const SOURCES = {
  synthetic: () => require('./synthetic'),
  file: () => require('./file'),
  provider: () => require('./provider'),
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
