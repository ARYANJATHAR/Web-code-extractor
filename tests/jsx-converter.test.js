const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { toPascalCase, escapeJSX, parseInlineStyle, mapAttributeName } = require('../lib/jsx-converter.js');

describe('jsx-converter', () => {
  it('converts strings to PascalCase', () => {
    assert.equal(toPascalCase('hero-section'), 'HeroSection');
    assert.equal(toPascalCase('btn_primary'), 'BtnPrimary');
  });

  it('escapes JSX special characters', () => {
    assert.equal(escapeJSX('a < b & c'), 'a &lt; b &amp; c');
    assert.match(escapeJSX('{value}'), /&#123;/);
  });

  it('parses inline style strings to camelCase objects', () => {
    const result = parseInlineStyle('background-color: red; font-size: 16px');
    assert.equal(result.backgroundColor, 'red');
    assert.equal(result.fontSize, '16px');
  });

  it('maps HTML attributes to JSX names', () => {
    assert.equal(mapAttributeName('class'), 'className');
    assert.equal(mapAttributeName('for'), 'htmlFor');
    assert.equal(mapAttributeName('tabindex'), 'tabIndex');
  });
});
