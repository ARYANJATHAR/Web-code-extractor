const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseInlineStyleBlock, getDefaultStyles } = require('../lib/css-extractor.js');

describe('css-extractor', () => {
  it('parses inline style blocks into CSS declarations', () => {
    const result = parseInlineStyleBlock('color: red; margin-top: 10px');
    assert.match(result, /color: red/);
    assert.match(result, /margin-top: 10px/);
  });

  it('returns default style filter values', () => {
    const defaults = getDefaultStyles();
    assert.equal(defaults.display, 'block');
    assert.equal(defaults.position, 'static');
  });
});
