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

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Webflow Code Extractor installed:', details.reason);

  // User choice: wipe extraction history on update so legacy entries
  // with raw-HTML previews can never render again.
  if (details.reason === 'update') {
    try {
      await chrome.storage.local.remove('wf-extraction-history');
      console.log('Cleared extraction history after update');
    } catch (err) {
      console.warn('Could not clear history on update:', err);
    }
  }

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

chrome.runtime.onMessage.addListener((message) => {
  // No async response needed; return false so the channel closes promptly.
  // elementSelected is handled by the popup via its own listener.
  if (message && message.action === 'elementSelected') {
    return false;
  }
  return false;
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
      // Restricted pages (chrome://, Web Store, PDFs) or already-injected.
      console.warn('Inject skipped for', file, ':', err && err.message);
    }
  }
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content/content.css'] });
  } catch (err) {
    console.warn('CSS inject skipped:', err && err.message);
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
