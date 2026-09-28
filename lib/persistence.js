(function (global) {
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function retryWithBackoff(operation, options = {}) {
    const retries = options.retries ?? 3;
    const backoffMs = options.backoffMs ?? 150;
    let lastError = null;

    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const result = await operation(attempt);
        return { success: true, result, attempts: attempt + 1 };
      } catch (err) {
        lastError = err;
        if (attempt < retries - 1) {
          await delay(backoffMs * (attempt + 1));
        }
      }
    }

    return { success: false, error: lastError, attempts: retries };
  }

  function isQuotaError(err) {
    if (!err) return false;
    return err.name === 'QuotaExceededError'
      || err.code === 22
      || /quota/i.test(err.message || '');
  }

  function isSecurityError(err) {
    if (!err) return false;
    return err.name === 'SecurityError'
      || err.code === 18
      || /denied|blocked|access/i.test(err.message || '');
  }

  function writeSessionPayload(code) {
    if (typeof sessionStorage === 'undefined') {
      const err = new Error('sessionStorage unavailable');
      err.nonRetryable = true;
      throw err;
    }
    const payload = JSON.stringify(code);
    try {
      sessionStorage.setItem('wf-extractor-code', payload);
      sessionStorage.setItem('wf-extractor-timestamp', Date.now().toString());
    } catch (err) {
      if (isSecurityError(err)) {
        err.nonRetryable = true;
        throw err;
      }
      if (isQuotaError(err)) {
        // Full-page payload too large: store truncated marker so popup
        // can still show a message instead of failing silently.
        try {
          const slim = JSON.stringify({
            html: String(code.html || '').slice(0, 200000),
            css: String(code.css || '').slice(0, 200000),
            note: 'truncated: page too large for sessionStorage'
          });
          sessionStorage.setItem('wf-extractor-code', slim);
          sessionStorage.setItem('wf-extractor-timestamp', Date.now().toString());
          return slim;
        } catch (inner) {
          throw err;
        }
      }
      throw err;
    }
    let readBack = null;
    try {
      readBack = sessionStorage.getItem('wf-extractor-code');
    } catch (err) {
      err.nonRetryable = true;
      throw err;
    }
    if (readBack !== payload) {
      throw new Error('Session storage reconciliation failed');
    }
    return readBack;
  }

  async function persistExtractionWithReconciliation(code, options = {}) {
    const storageResult = await retryWithBackoff(async (attempt) => {
      try {
        return writeSessionPayload(code);
      } catch (err) {
        if (err && err.nonRetryable) {
          // Fail fast: retrying a blocked sessionStorage is pointless.
          const wrapped = new Error(err.message);
          wrapped.nonRetryable = true;
          wrapped.cause = err;
          throw wrapped;
        }
        throw err;
      }
    }, options);
    if (!storageResult.success) {
      const err = storageResult.error;
      const blocked = err && (err.nonRetryable || isSecurityError(err.cause || err));
      return { persisted: false, storage: storageResult, blocked };
    }

    let messageDelivered = false;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      const messageResult = await retryWithBackoff(
        () => new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ action: 'elementSelected', code }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(true);
          });
        }),
        options
      );
      messageDelivered = messageResult.success;
    }

    return {
      persisted: true,
      storage: storageResult,
      messageDelivered,
      reconciled: storageResult.success
    };
  }

  const api = {
    delay,
    retryWithBackoff,
    writeSessionPayload,
    persistExtractionWithReconciliation
  };

  global.WfExtractor = global.WfExtractor || {};
  Object.assign(global.WfExtractor, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
