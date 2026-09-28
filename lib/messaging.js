(function (global) {
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function sendTabMessage(tabId, message, options = {}) {
    const retries = options.retries ?? 3;
    const backoffMs = options.backoffMs ?? 200;

    return new Promise((resolve, reject) => {
      let attempt = 0;

      function trySend() {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            attempt += 1;
            if (attempt < retries) {
              delay(backoffMs * attempt).then(trySend);
              return;
            }
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      }

      trySend();
    });
  }

  async function injectContentScripts(tabId, files) {
    for (const file of files) {
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
      } catch (err) {
        // Already injected, or restricted page (chrome://, Web Store, PDF).
        console.warn('Content script inject skipped:', file, err && err.message);
      }
    }

    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content/content.css']
      });
    } catch (err) {
      console.warn('CSS inject skipped:', err && err.message);
    }
  }

  const CONTENT_SCRIPT_FILES = [
    'lib/html-formatter.js',
    'lib/webflow-mapper.js',
    'lib/jsx-converter.js',
    'lib/css-extractor.js',
    'lib/tailwind-converter.js',
    'lib/react-generator.js',
    'lib/persistence.js',
    'lib/picker-state.js',
    'lib/extraction-pipeline.js',
    'content/content.js'
  ];

  const api = { sendTabMessage, injectContentScripts, CONTENT_SCRIPT_FILES };
  global.WfMessaging = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
