// DOM Elements
const togglePickerBtn = document.getElementById('togglePicker');
const extractPageBtn = document.getElementById('extractPage');
const copyCodeBtn = document.getElementById('copyCode');
const codeOutput = document.getElementById('codeOutput');
const statusEl = document.getElementById('status');
const tabs = document.querySelectorAll('.tab');

// Options
const includeChildrenCheck = document.getElementById('includeChildren');
const includeComputedCheck = document.getElementById('includeComputed');
const cleanWebflowCheck = document.getElementById('cleanWebflow');

// State
let currentCode = {
  html: '',
  css: '',
  react: '',
  combined: ''
};
let activeTab = 'html';
let isPickerActive = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check for stored code from element picker
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const code = sessionStorage.getItem('wf-extractor-code');
        const timestamp = sessionStorage.getItem('wf-extractor-timestamp');
        if (code && timestamp) {
          // Only use if captured within last 30 seconds
          if (Date.now() - parseInt(timestamp) < 30000) {
            sessionStorage.removeItem('wf-extractor-code');
            sessionStorage.removeItem('wf-extractor-timestamp');
            return JSON.parse(code);
          }
        }
        return null;
      }
    });
    
    if (results && results[0] && results[0].result) {
      currentCode = results[0].result;
      updateCodeDisplay();
      showStatus('success', 'Element code loaded!');
    }
  } catch (err) {
    console.log('Could not check for stored code:', err);
  }
  
  // Check if picker is already active
  chrome.tabs.sendMessage(tab.id, { action: 'getPickerState' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.isActive) {
      isPickerActive = true;
      togglePickerBtn.classList.add('active');
      togglePickerBtn.innerHTML = '<span class="icon">🛑</span> Stop Picker';
    }
  });
});

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    updateCodeDisplay();
  });
});

// Toggle element picker
togglePickerBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // First inject the content script if needed
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content.js']
    }).catch(() => {}); // Ignore if already injected
    
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content/content.css']
    }).catch(() => {}); // Ignore if already injected

    isPickerActive = !isPickerActive;
    
    chrome.tabs.sendMessage(tab.id, { 
      action: 'togglePicker',
      options: getOptions()
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('error', 'Could not connect to page. Try refreshing.');
        isPickerActive = false;
        return;
      }
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
    showStatus('error', 'Error: ' + error.message);
  }
});

// Extract full page
extractPageBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject content script if needed
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content.js']
    }).catch(() => {});

    showStatus('info', 'Extracting page code...');

    chrome.tabs.sendMessage(tab.id, { 
      action: 'extractFullPage',
      options: getOptions()
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('error', 'Could not connect to page. Try refreshing.');
        return;
      }
      
      if (response && response.success) {
        currentCode = response.code;
        updateCodeDisplay();
        showStatus('success', 'Page code extracted successfully!');
      } else {
        showStatus('error', 'Failed to extract page code');
      }
    });
  } catch (error) {
    showStatus('error', 'Error: ' + error.message);
  }
});

// Copy code
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

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'elementSelected') {
    currentCode = message.code;
    updateCodeDisplay();
    showStatus('success', 'Element code extracted!');
    
    // Auto-stop picker after selection
    isPickerActive = false;
    togglePickerBtn.classList.remove('active');
    togglePickerBtn.innerHTML = '<span class="icon">🎯</span> Start Element Picker';
  }
});

// Helper functions
function getOptions() {
  return {
    includeChildren: includeChildrenCheck.checked,
    includeComputed: includeComputedCheck.checked,
    cleanWebflow: cleanWebflowCheck.checked
  };
}

function updateCodeDisplay() {
  const code = currentCode[activeTab] || '';
  if (code) {
    codeOutput.textContent = code;
  }
}

function showStatus(type, message) {
  statusEl.className = 'status ' + type;
  statusEl.textContent = message;
  
  if (type === 'success') {
    setTimeout(hideStatus, 3000);
  }
}

function hideStatus() {
  statusEl.className = 'status';
  statusEl.textContent = '';
}
