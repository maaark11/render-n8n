'use strict';

// Synthetic source — wraps the deterministic generator.
const { generate } = require('../generate');

async function load() {
  return generate();
}

module.exports = { load };
