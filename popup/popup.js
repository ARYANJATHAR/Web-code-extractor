const togglePickerBtn = document.getElementById('togglePicker');
const extractPageBtn = document.getElementById('extractPage');
const copyCodeBtn = document.getElementById('copyCode');
const clearHistoryBtn = document.getElementById('clearHistory');
const codeOutput = document.getElementById('codeOutput');
const statusEl = document.getElementById('status');
const historyList = document.getElementById('historyList');
const tabs = document.querySelectorAll('.tab');

const includeChildrenCheck = document.getElementById('includeChildren');
const includeComputedCheck = document.getElementById('includeComputed');
const cleanWebflowCheck = document.getElementById('cleanWebflow');
const editorTitle = document.getElementById('editorTitle');
const charCount = document.getElementById('charCount');
const editorPanel = document.querySelector('.editor');

const TAB_LABELS = { html: 'HTML', css: 'CSS', react: 'React', tailwind: 'Tailwind', mapped: 'Mapped', combined: 'Combined' };

function setPickerButton(active) {
  isPickerActive = active;
  togglePickerBtn.classList.toggle('active', active);
  const label = togglePickerBtn.querySelector('.btn-label');
  if (label) label.textContent = active ? 'Stop picker' : 'Select element';
  const pill = document.getElementById('pickerState');
  if (pill) pill.classList.toggle('on', active);
  const pillText = document.getElementById('pickerStateText');
  if (pillText) pillText.textContent = active ? 'Picker on' : 'Idle';
}

function setCopyButton(copied) {
  const label = copyCodeBtn.querySelector('span:last-child');
  if (label) label.textContent = copied ? 'Copied' : 'Copy';
}

let currentCode = {
  html: '',
  css: '',
  react: '',
  tailwind: '',
  mapped: '',
  combined: ''
};
let activeTab = 'html';
let isPickerActive = false;

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const code = sessionStorage.getItem('wf-extractor-code');
        const timestamp = sessionStorage.getItem('wf-extractor-timestamp');
        if (code && timestamp && Date.now() - parseInt(timestamp) < 30000) {
          sessionStorage.removeItem('wf-extractor-code');
          sessionStorage.removeItem('wf-extractor-timestamp');
          return JSON.parse(code);
        }
        return null;
      }
    });

    if (results?.[0]?.result) {
      await applyExtractedCode(results[0].result, tab.url);
      showStatus('success', 'Element code loaded.');
    }
  } catch (err) {
    console.log('Could not check for stored code:', err);
  }

  try {
    const response = await WfMessaging.sendTabMessage(tab.id, { action: 'getPickerState' }, { retries: 2 });
    if (response?.isActive) {
      setPickerButton(true);
      showStatus('info', 'Picker is on — click any element on the page, or press Stop.');
    }
  } catch (err) {
    // Content script not injected yet
  }

  await renderHistory();
  updateCodeDisplay();
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => {
      t.classList.remove('active');
      t.removeAttribute('aria-current');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-current', 'true');
    activeTab = tab.dataset.tab;
    updateCodeDisplay();
  });
});

function isRestrictedUrl(url) {
  // Universal extension: works on any normal website, but Chrome blocks
  // scripting on browser pages, Web Store, and non-http(s) schemes.
  if (!url) return true;
  return /^(chrome:|edge:|about:|chrome-extension:|moz-extension:|view-source:|file:|data:)/i.test(url)
    || /chrome\.google\.com\/webstore/i.test(url)
    || /chromewebstore\.google\.com/i.test(url);
}

function connectionErrorMessage(tab) {
  if (tab && isRestrictedUrl(tab.url)) {
    return 'This browser page blocks extensions. Open any normal website to extract code.';
  }
  return 'Could not connect to page. Try refreshing the page, then retry.';
}

async function syncPickerButtonFromContent(tabId) {
  try {
    const state = await WfMessaging.sendTabMessage(tabId, { action: 'getPickerState' }, { retries: 2 });
    setPickerButton(!!(state && state.isActive));
  } catch (err) {
    // Content script not ready yet; keep current local state.
  }
}

togglePickerBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (isRestrictedUrl(tab && tab.url)) {
      showStatus('error', connectionErrorMessage(tab));
      return;
    }
    await WfMessaging.injectContentScripts(tab.id, WfMessaging.CONTENT_SCRIPT_FILES);

    await WfMessaging.sendTabMessage(tab.id, {
      action: 'togglePicker',
      options: getOptions()
    });

    await syncPickerButtonFromContent(tab.id);
    if (isPickerActive) {
      showStatus('info', 'Picker is on — click any element, or press Stop or Esc to exit.');
    } else {
      hideStatus();
    }
  } catch (error) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => [null]);
    showStatus('error', connectionErrorMessage(tab));
    setPickerButton(false);
  }
});

extractPageBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (isRestrictedUrl(tab && tab.url)) {
      showStatus('error', connectionErrorMessage(tab));
      return;
    }
    await WfMessaging.injectContentScripts(tab.id, WfMessaging.CONTENT_SCRIPT_FILES);
    showStatus('info', 'Extracting page code...');

    const response = await WfMessaging.sendTabMessage(tab.id, {
      action: 'extractFullPage',
      options: getOptions()
    });

    if (response?.success) {
      await applyExtractedCode(response.code, tab.url);
      showStatus('success', 'Page code extracted.');
    } else {
      showStatus('error', 'Page extraction returned no code.');
    }
  } catch (error) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => [null]);
    showStatus('error', connectionErrorMessage(tab));
  }
});

copyCodeBtn.addEventListener('click', async () => {
  const code = currentCode[activeTab] || codeOutput.textContent;
  if (!code || codeOutput.classList.contains('is-empty')) {
    showStatus('info', 'Nothing to copy yet. Extract an element first.');
    return;
  }
  try {
    await navigator.clipboard.writeText(code);
    showStatus('success', 'Copied to clipboard.');
    setCopyButton(true);
    setTimeout(() => setCopyButton(false), 1600);
  } catch (error) {
    showStatus('error', 'Copy failed in this context. Select the code manually.');
  }
});

clearHistoryBtn.addEventListener('click', async () => {
  await WfStorage.clearHistory();
  await renderHistory();
  showStatus('success', 'History cleared');
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'elementSelected') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      applyExtractedCode(message.code, tab?.url || '');
    });
    showStatus('success', 'Element code extracted.');
    setPickerButton(false);
  }
});

function toSafePreview(raw) {
  // Strip tags so history preview is always plain text (XSS-safe).
  // Works for universal extraction: any website's HTML becomes inert text.
  return String(raw || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

async function applyExtractedCode(code, url) {
  currentCode = code;
  updateCodeDisplay();

  const preview = toSafePreview(code.html || code.css || code.react || '');
  try {
    await WfStorage.saveExtraction({
      url,
      selector: 'element',
      preview,
      code
    });
  } catch (err) {
    console.warn('History save failed (quota/full page?):', err);
    showStatus('error', 'Code extracted, but history is full and could not be saved.');
  }
  await renderHistory();
}

async function renderHistory() {
  const history = await WfStorage.getHistory();
  historyList.textContent = '';

  if (!history.length) {
    const empty = document.createElement('li');
    empty.className = 'history-empty';
    empty.textContent = 'No saved extractions yet';
    historyList.appendChild(empty);
    return;
  }

  history.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.tabIndex = 0;
    let host = '';
    try {
      host = item.url ? new URL(item.url).hostname : '';
    } catch (err) {
      host = '';
    }
    let when = 'Saved extraction';
    try {
      when = new Date(item.savedAt).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (err) {
      when = 'Saved extraction';
    }
    const meta = document.createElement('div');
    meta.className = 'history-meta';
    meta.textContent = host ? `${when} — ${host}` : when;
    const previewEl = document.createElement('div');
    previewEl.className = 'history-preview';
    // textContent keeps even legacy entries with raw HTML inert.
    previewEl.textContent = toSafePreview(item.preview) || 'Extraction';
    li.appendChild(meta);
    li.appendChild(previewEl);
    const load = () => {
      currentCode = item.code;
      updateCodeDisplay();
      showStatus('info', 'Loaded from history.');
    };
    li.addEventListener('click', load);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        load();
      }
    });
    historyList.appendChild(li);
  });
}

function getOptions() {
  return {
    includeChildren: includeChildrenCheck.checked,
    includeComputed: includeComputedCheck.checked,
    cleanWebflow: cleanWebflowCheck.checked
  };
}

function formatCharCount(n) {
  if (!n) return '0 chars';
  if (n < 1000) return `${n} chars`;
  return `${(n / 1000).toFixed(1)}k chars`;
}

function updateCodeDisplay() {
  const code = currentCode[activeTab] || '';
  const empty = !code;
  codeOutput.textContent = code || 'Select an element on the page, or run a full-page extraction. Output appears here.';
  codeOutput.classList.toggle('is-empty', empty);
  if (editorTitle) editorTitle.textContent = TAB_LABELS[activeTab] || activeTab;
  if (charCount) charCount.textContent = formatCharCount(code.length);
  if (editorPanel) editorPanel.classList.toggle('has-content', !empty);
}

function showStatus(type, message) {
  statusEl.className = 'status ' + type;
  statusEl.textContent = message;
  if (type === 'success') setTimeout(hideStatus, 3000);
}

function hideStatus() {
  statusEl.className = 'status';
  statusEl.textContent = '';
}
