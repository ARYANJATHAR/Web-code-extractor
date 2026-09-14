const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  mapWebflowClass,
  buildClassMappingTable,
  applyMappingToHTML,
  formatMappingOutput
} = require('../lib/webflow-mapper.js');

describe('webflow-mapper', () => {
  it('maps known Webflow classes to semantic names', () => {
    assert.equal(mapWebflowClass('w-layout-grid'), 'grid-container');
    assert.equal(mapWebflowClass('w-container'), 'container');
  });

  it('maps unknown w- classes to wf- prefix', () => {
    assert.equal(mapWebflowClass('w-custom-block'), 'wf-custom-block');
  });

  it('builds a mapping table from HTML', () => {
    const html = '<div class="w-container w-richtext">Content</div>';
    const table = buildClassMappingTable(html);
    assert.equal(table.mappings.length, 2);
    assert.match(table.summary, /w-container/);
  });

  it('applies mappings to HTML output', () => {
    const html = '<div class="w-container"></div>';
    const result = applyMappingToHTML(html);
    assert.match(result, /container/);
    assert.doesNotMatch(result, /w-container/);
  });

  it('formats mapping output for display', () => {
    const table = buildClassMappingTable('<div class="w-button"></div>');
    const output = formatMappingOutput(table);
    assert.match(output, /w-button/);
    assert.match(output, /button/);
  });
});
