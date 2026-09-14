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

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Webflow Code Extractor installed:', details.reason);

  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'extract-element',
      title: 'Extract Element Code',
      contexts: ['all']
    }, () => {
      if (chrome.runtime.lastError) {
        console.log('Context menu error:', chrome.runtime.lastError.message);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'elementSelected') {
    return true;
  }
  return true;
});

function sendTabMessageWithRetry(tabId, message, attempt = 0) {
  const maxRetries = 3;
  const backoffMs = 200;

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        if (attempt < maxRetries - 1) {
          setTimeout(() => {
            sendTabMessageWithRetry(tabId, message, attempt + 1).then(resolve).catch(reject);
          }, backoffMs * (attempt + 1));
          return;
        }
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function injectAllContentScripts(tabId) {
  for (const file of CONTENT_SCRIPT_FILES) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
    } catch (err) {
      // May already be injected
    }
  }
}

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'extract-element' || !tab?.id) return;

    try {
      await injectAllContentScripts(tab.id);
      await sendTabMessageWithRetry(tab.id, {
        action: 'togglePicker',
        options: {
          includeChildren: true,
          includeComputed: true,
          cleanWebflow: false
        }
      });
    } catch (err) {
      console.error('Failed to start picker from context menu:', err);
    }
  });
}
