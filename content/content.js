// Content script for Webflow Code Extractor
(function () {
  if (window.webflowExtractorLoaded) {
    console.log('Webflow Extractor already loaded');
    return;
  }
  window.webflowExtractorLoaded = true;

  const WE = globalThis.WfExtractor;
  const { PickerStates, createPickerStateMachine } = WE;
  const picker = createPickerStateMachine(PickerStates.IDLE);

  let hoveredElement = null;
  let lastSelectedCode = null;
  let options = {
    includeChildren: true,
    includeComputed: true,
    cleanWebflow: false
  };

  const overlay = document.createElement('div');
  overlay.id = 'wf-extractor-overlay';
  document.body.appendChild(overlay);

  const tooltip = document.createElement('div');
  tooltip.id = 'wf-extractor-tooltip';
  document.body.appendChild(tooltip);

  picker.onChange((event) => {
    const activeStates = new Set([
      PickerStates.ARMED,
      PickerStates.HOVERING,
      PickerStates.SELECTING,
      PickerStates.EXTRACTING
    ]);
    document.body.classList.toggle('wf-picker-active', activeStates.has(event.state));
    const showOverlay = event.state === PickerStates.HOVERING || event.state === PickerStates.SELECTING;
    overlay.style.display = showOverlay ? 'block' : 'none';
    tooltip.style.display = showOverlay ? 'block' : 'none';
  });

  function handleMouseMove(e) {
    if (picker.getState() !== PickerStates.ARMED && picker.getState() !== PickerStates.HOVERING) {
      return;
    }

    if (picker.getState() === PickerStates.ARMED) {
      picker.transition(PickerStates.HOVERING);
    }

    overlay.style.display = 'none';
    tooltip.style.display = 'none';
    const element = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.display = 'block';
    tooltip.style.display = 'block';

    if (!element || element === document.body || element === document.documentElement) return;

    hoveredElement = element;
    const rect = element.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';

    const tagName = element.tagName.toLowerCase();
    let classes = '';
    if (element.className && typeof element.className === 'string') {
      classes = '.' + element.className.toString().split(' ').filter(Boolean).slice(0, 2).join('.');
    }
    const id = element.id ? '#' + element.id : '';
    tooltip.textContent = `${tagName}${id}${classes}`.substring(0, 60);
    tooltip.style.left = Math.min(e.clientX + 15, window.innerWidth - 250) + 'px';
    tooltip.style.top = Math.min(e.clientY + 15, window.innerHeight - 40) + 'px';
  }

  async function handleClick(e) {
    const state = picker.getState();
    if (state !== PickerStates.HOVERING && state !== PickerStates.ARMED) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (!hoveredElement) return false;

    picker.transition(PickerStates.SELECTING);
    picker.transition(PickerStates.EXTRACTING);

    try {
      const { code, persistence } = await WE.runElementExtractionWithPersistence(
        hoveredElement,
        options,
        { retries: 3, backoffMs: 200 }
      );

      if (!persistence.reconciled) {
        throw new Error('Extraction persistence failed');
      }

      lastSelectedCode = code;
      picker.transition(PickerStates.COMPLETE);
      showConfirmation();
      picker.transition(PickerStates.IDLE);
      stopPicker();
    } catch (err) {
      console.error('Extraction failed:', err);
      picker.transition(PickerStates.ERROR);
      picker.transition(PickerStates.IDLE);
      stopPicker();
    }

    return false;
  }

  function showConfirmation() {
    const confirm = document.createElement('div');
    confirm.id = 'wf-extractor-confirm';
    confirm.innerHTML = '✓ Element captured! Open extension to see code.';
    confirm.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 12px 20px; border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px; z-index: 2147483647;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(confirm);
    setTimeout(() => {
      confirm.style.opacity = '0';
      confirm.style.transition = 'opacity 0.3s ease';
      setTimeout(() => confirm.remove(), 300);
    }, 2000);
  }

  function startPicker() {
    picker.reset();
    picker.transition(PickerStates.ARMED);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
  }

  function stopPicker() {
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    overlay.style.display = 'none';
    tooltip.style.display = 'none';
    hoveredElement = null;
    if (picker.getState() !== PickerStates.IDLE) {
      picker.reset();
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'togglePicker') {
      options = { ...options, ...(message.options || {}) };
      if (picker.isActive()) {
        stopPicker();
      } else {
        startPicker();
      }
      sendResponse({ success: true, isActive: picker.isActive(), state: picker.getState() });
      return true;
    }

    if (message.action === 'getPickerState') {
      sendResponse({ isActive: picker.isActive(), state: picker.getState() });
      return true;
    }

    if (message.action === 'getLastCode') {
      sendResponse({ code: lastSelectedCode });
      return true;
    }

    if (message.action === 'extractFullPage') {
      options = { ...options, ...(message.options || {}) };
      sendResponse({ success: true, code: WE.runFullPageExtraction() });
      return true;
    }

    return true;
  });

  window.addEventListener('beforeunload', () => {
    stopPicker();
    overlay.remove();
    tooltip.remove();
  });

  console.log('Webflow Code Extractor loaded');
})();
