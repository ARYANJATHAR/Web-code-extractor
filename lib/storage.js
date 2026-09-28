(function (global) {
  const STORAGE_KEY = 'wf-extraction-history';
  const MAX_HISTORY = 10;

  async function getHistory() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  }

  const MAX_CODE_CHARS_PER_FIELD = 200000;
  const MAX_COMBINED_CHARS = 300000;

  function sanitizePreview(raw) {
    return String(raw || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }

  function truncateCode(code) {
    const out = {};
    for (const key of ['html', 'css', 'react', 'tailwind', 'mapped', 'combined']) {
      let value = code && code[key] ? String(code[key]) : '';
      if (value.length > MAX_CODE_CHARS_PER_FIELD) {
        value = value.slice(0, MAX_CODE_CHARS_PER_FIELD) + '\n/* ... truncated (history cap) ... */';
      }
      out[key] = value;
    }
    // Hard cap combined which can hold a full page.
    if (out.combined && out.combined.length > MAX_COMBINED_CHARS) {
      out.combined = out.combined.slice(0, MAX_COMBINED_CHARS) + '\n<!-- ... truncated ... -->';
    }
    return out;
  }

  async function saveExtraction(entry) {
    const history = await getHistory();
    const record = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      url: String(entry.url || '').slice(0, 500),
      selector: String(entry.selector || '').slice(0, 200),
      tab: entry.tab || 'html',
      preview: sanitizePreview(entry.preview),
      code: truncateCode(entry.code || {})
    };

    history.unshift(record);
    const capped = history.slice(0, MAX_HISTORY);
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: capped });
    } catch (err) {
      // Quota exceeded (large full-page extraction): drop oldest and
      // retry once with minimal code so at least the latest is kept.
      const minimal = { ...record, code: truncateCode({ html: record.code.html, css: record.code.css }) };
      const fallback = [minimal, ...history.slice(0, MAX_HISTORY - 1)];
      await chrome.storage.local.set({ [STORAGE_KEY]: fallback });
    }
    return record;
  }

  async function getExtractionById(id) {
    const history = await getHistory();
    return history.find((item) => item.id === id) || null;
  }

  async function clearHistory() {
    await chrome.storage.local.remove(STORAGE_KEY);
  }

  const api = { getHistory, saveExtraction, getExtractionById, clearHistory, MAX_HISTORY };
  global.WfStorage = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
