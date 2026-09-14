(function (global) {
  const STORAGE_KEY = 'wf-extraction-history';
  const MAX_HISTORY = 10;

  async function getHistory() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  }

  async function saveExtraction(entry) {
    const history = await getHistory();
    const record = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      url: entry.url || '',
      selector: entry.selector || '',
      tab: entry.tab || 'html',
      preview: (entry.preview || '').slice(0, 120),
      code: entry.code || {}
    };

    history.unshift(record);
    await chrome.storage.local.set({ [STORAGE_KEY]: history.slice(0, MAX_HISTORY) });
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
