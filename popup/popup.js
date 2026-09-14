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
      showStatus('success', 'Element code loaded!');
    }
  } catch (err) {
    console.log('Could not check for stored code:', err);
  }

  try {
    const response = await WfMessaging.sendTabMessage(tab.id, { action: 'getPickerState' }, { retries: 2 });
    if (response?.isActive) {
      isPickerActive = true;
      togglePickerBtn.classList.add('active');
      togglePickerBtn.innerHTML = '<span class="icon">🛑</span> Stop Picker';
    }
  } catch (err) {
    // Content script not injected yet
  }

  await renderHistory();
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    updateCodeDisplay();
  });
});

togglePickerBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await WfMessaging.injectContentScripts(tab.id, WfMessaging.CONTENT_SCRIPT_FILES);

    isPickerActive = !isPickerActive;

    await WfMessaging.sendTabMessage(tab.id, {
      action: 'togglePicker',
      options: getOptions()
    });

    if (isPickerActive) {
      togglePickerBtn.classList.add('active');
      togglePickerBtn.innerHTML = '<span class="icon">🛑</span> Stop Picker';
      showStatus('info', 'Click on any element to extract its code');
    } else {
      togglePickerBtn.classList.remove('active');
      togglePickerBtn.innerHTML = '<span class="icon">🎯</span> Start Element Picker';
      hideStatus();
    }
  } catch (error) {
    showStatus('error', 'Could not connect to page. Try refreshing.');
    isPickerActive = false;
  }
});

extractPageBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await WfMessaging.injectContentScripts(tab.id, WfMessaging.CONTENT_SCRIPT_FILES);
    showStatus('info', 'Extracting page code...');

    const response = await WfMessaging.sendTabMessage(tab.id, {
      action: 'extractFullPage',
      options: getOptions()
    });

    if (response?.success) {
      await applyExtractedCode(response.code, tab.url);
      showStatus('success', 'Page code extracted successfully!');
    } else {
      showStatus('error', 'Failed to extract page code');
    }
  } catch (error) {
    showStatus('error', 'Could not connect to page. Try refreshing.');
  }
});

copyCodeBtn.addEventListener('click', async () => {
  const code = currentCode[activeTab] || codeOutput.textContent;
  try {
    await navigator.clipboard.writeText(code);
    showStatus('success', 'Code copied to clipboard!');
    copyCodeBtn.innerHTML = '<span class="icon">✅</span> Copied!';
    setTimeout(() => {
      copyCodeBtn.innerHTML = '<span class="icon">📋</span> Copy';
    }, 2000);
  } catch (error) {
    showStatus('error', 'Failed to copy code');
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
    showStatus('success', 'Element code extracted!');
    isPickerActive = false;
    togglePickerBtn.classList.remove('active');
    togglePickerBtn.innerHTML = '<span class="icon">🎯</span> Start Element Picker';
  }
});

async function applyExtractedCode(code, url) {
  currentCode = code;
  updateCodeDisplay();

  const preview = code.html || code.css || code.react || '';
  await WfStorage.saveExtraction({
    url,
    selector: 'element',
    preview,
    code
  });
  await renderHistory();
}

async function renderHistory() {
  const history = await WfStorage.getHistory();
  historyList.innerHTML = '';

  if (!history.length) {
    historyList.innerHTML = '<li class="history-empty">No saved extractions yet</li>';
    return;
  }

  history.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div class="history-meta">${new Date(item.savedAt).toLocaleString()}</div>
      <div class="history-preview">${item.preview || 'Extraction'}</div>
    `;
    li.addEventListener('click', () => {
      currentCode = item.code;
      updateCodeDisplay();
      showStatus('info', 'Loaded from history');
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

function updateCodeDisplay() {
  const code = currentCode[activeTab] || '';
  codeOutput.textContent = code || 'No output for this tab yet.';
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
