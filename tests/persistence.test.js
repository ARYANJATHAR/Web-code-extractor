const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { retryWithBackoff } = require('../lib/persistence.js');

describe('persistence', () => {
  it('retries failed operations with backoff', async () => {
    let attempts = 0;
    const result = await retryWithBackoff(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('temporary failure');
      return 'ok';
    }, { retries: 3, backoffMs: 1 });

    assert.equal(result.success, true);
    assert.equal(result.result, 'ok');
    assert.equal(result.attempts, 3);
  });

  it('returns failure after exhausting retries', async () => {
    const result = await retryWithBackoff(async () => {
      throw new Error('permanent failure');
    }, { retries: 2, backoffMs: 1 });

    assert.equal(result.success, false);
    assert.equal(result.attempts, 2);
  });
});
