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

  function writeSessionPayload(code) {
    const payload = JSON.stringify(code);
    sessionStorage.setItem('wf-extractor-code', payload);
    sessionStorage.setItem('wf-extractor-timestamp', Date.now().toString());
    const readBack = sessionStorage.getItem('wf-extractor-code');
    if (readBack !== payload) {
      throw new Error('Session storage reconciliation failed');
    }
    return readBack;
  }

  async function persistExtractionWithReconciliation(code, options = {}) {
    const storageResult = await retryWithBackoff(async () => writeSessionPayload(code), options);
    if (!storageResult.success) {
      return { persisted: false, storage: storageResult };
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
