const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatHTML, cleanWebflowHTML, formatCSS } = require('../lib/html-formatter.js');

describe('html-formatter', () => {
  it('formats HTML with indentation', () => {
    const input = '<div><p>Hi</p></div>';
    const result = formatHTML(input);
    assert.match(result, /<div>/);
    assert.match(result, /<p>Hi<\/p>/);
  });

  it('cleans Webflow classes and data attributes', () => {
    const input = '<div class="w-container hero" data-w-id="abc">Text</div>';
    const result = cleanWebflowHTML(input);
    assert.doesNotMatch(result, /w-container/);
    assert.doesNotMatch(result, /data-w-id/);
    assert.match(result, /hero/);
  });

  it('formats CSS style blocks', () => {
    const styles = [{ selector: '.hero', styles: '  color: red;' }];
    const result = formatCSS(styles);
    assert.match(result, /\.hero \{/);
    assert.match(result, /color: red/);
  });
});
