// Content script for Webflow Code Extractor
(function () {
  if (window.webflowExtractorLoaded) {
    console.log('Webflow Extractor already loaded');
    return;
  }
  window.webflowExtractorLoaded = true;

  const WE = globalThis.WfExtractor || {};
  if (!WE.createPickerStateMachine || !WE.PickerStates || !WE.runElementExtractionWithPersistence) {
    console.error('Webflow Extractor: core libs missing (partial injection). Reload the page and retry.');
    window.webflowExtractorLoaded = false;
    return;
  }
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

  // Persistent on/off indicator with a Stop control, so users always
  // know the picker is armed and how to turn it off.
  const statusbar = document.createElement('div');
  statusbar.id = 'wf-extractor-statusbar';
  statusbar.innerHTML = '<span class="wf-dot"></span>'
    + '<span class="wf-text">Element picker on — click any element</span>'
    + '<kbd class="wf-kbd">Esc</kbd>'
    + '<button type="button" class="wf-stop" data-wf-stop>Stop</button>';
  statusbar.style.display = 'none';
  document.body.appendChild(statusbar);
  statusbar.querySelector('[data-wf-stop]').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    stopPicker();
  });

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

  function handleKeyDown(e) {
    if (e.key === 'Escape' && picker.isActive()) {
      e.preventDefault();
      stopPicker();
    }
  }

  async function handleClick(e) {
    // Let status-bar clicks (Stop button) pass through to their handler.
    if (e.target && e.target.closest && e.target.closest('#wf-extractor-statusbar')) return;

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
    confirm.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">'
      + '<circle cx="8" cy="8" r="7" fill="#7fd6a4"/>'
      + '<path d="M5.5 8.2 7.2 10 10.6 6.2" stroke="#0f1115" stroke-width="1.8"'
      + ' stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg><span>Element captured. Open the extension to view the code.</span>';
    confirm.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      display: flex; align-items: center; gap: 9px;
      background: #16181d; color: #e8eaf0;
      border: 1px solid #262b35; border-radius: 10px;
      padding: 10px 14px;
      font-family: ui-sans-serif, -apple-system, 'Segoe UI', sans-serif;
      font-size: 12.5px; font-weight: 500; z-index: 2147483647;
      box-shadow: 0 8px 28px rgba(0,0,0,0.45);
    `;
    document.body.appendChild(confirm);
    setTimeout(() => {
      confirm.style.opacity = '0';
      confirm.style.transition = 'opacity 0.3s ease';
      setTimeout(() => confirm.remove(), 300);
    }, 2000);
  }

  function hideHighlight() {
    overlay.style.display = 'none';
    tooltip.style.display = 'none';
  }

  function onScrollOrResize() {
    // Viewport moved: stale fixed overlay would point at the wrong element.
    // Hide until the next mousemove re-anchors it.
    if (picker.isActive()) hideHighlight();
  }

  function startPicker() {
    picker.reset();
    picker.transition(PickerStates.ARMED);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    statusbar.style.display = 'flex';
  }

  function stopPicker() {
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);
    hideHighlight();
    statusbar.style.display = 'none';
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
    statusbar.remove();
  });

  console.log('Webflow Code Extractor loaded');
})();
