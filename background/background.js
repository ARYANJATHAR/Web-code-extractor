// Background service worker for Webflow Code Extractor

// Handle installation - create context menu
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Webflow Code Extractor installed:', details.reason);
  
  // Create context menu only if API is available
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

// Handle messages between popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'elementSelected') {
    return true;
  }
  return true;
});

// Context menu click handler - wrapped in check
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'extract-element') {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      }).then(() => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'togglePicker',
          options: {
            includeChildren: true,
            includeComputed: true,
            cleanWebflow: false
          }
        });
      }).catch(err => {
        console.error('Failed to inject content script:', err);
      });
    }
  });
}
