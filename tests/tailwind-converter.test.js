const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  convertDeclarationsToTailwind,
  convertStylesToTailwind,
  formatTailwindOutput
} = require('../lib/tailwind-converter.js');

describe('tailwind-converter', () => {
  it('converts flex layout declarations to Tailwind utilities', () => {
    const classes = convertDeclarationsToTailwind({
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': 'center',
      'align-items': 'center'
    });
    assert.ok(classes.includes('flex'));
    assert.ok(classes.includes('flex-col'));
    assert.ok(classes.includes('justify-center'));
    assert.ok(classes.includes('items-center'));
  });

  it('converts extracted style blocks to Tailwind suggestions', () => {
    const styles = [{
      selector: '.hero',
      styles: '  display: flex;\n  justify-content: center;'
    }];
    const results = convertStylesToTailwind(styles);
    assert.equal(results.length, 1);
    assert.match(results[0].classes, /flex/);
  });

  it('formats Tailwind output for the popup tab', () => {
    const results = [{ selector: '.card', classes: 'flex p-[16px]' }];
    const output = formatTailwindOutput(results);
    assert.match(output, /\.card/);
    assert.match(output, /class="/);
  });
});
