// Content script for Webflow Code Extractor
(function() {
  // Prevent multiple injections
  if (window.webflowExtractorLoaded) {
    console.log('Webflow Extractor already loaded');
    return;
  }
  window.webflowExtractorLoaded = true;

  let isPickerActive = false;
  let hoveredElement = null;
  let lastSelectedCode = null;
  let options = {
    includeChildren: true,
    includeComputed: true,
    cleanWebflow: false
  };

  // Create highlight overlay
  const overlay = document.createElement('div');
  overlay.id = 'wf-extractor-overlay';
  document.body.appendChild(overlay);

  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'wf-extractor-tooltip';
  document.body.appendChild(tooltip);

  // Mouse move handler
  function handleMouseMove(e) {
    if (!isPickerActive) return;

    // Get element under cursor, ignoring our overlay elements
    overlay.style.display = 'none';
    tooltip.style.display = 'none';
    const element = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.display = 'block';
    tooltip.style.display = 'block';

    if (!element || element === document.body || element === document.documentElement) {
      return;
    }

    hoveredElement = element;
    
    const rect = element.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';

    // Update tooltip
    const tagName = element.tagName.toLowerCase();
    let classes = '';
    if (element.className && typeof element.className === 'string') {
      classes = '.' + element.className.toString().split(' ').filter(c => c).slice(0, 2).join('.');
    }
    const id = element.id ? '#' + element.id : '';
    
    tooltip.textContent = `${tagName}${id}${classes}`.substring(0, 60);
    tooltip.style.left = Math.min(e.clientX + 15, window.innerWidth - 250) + 'px';
    tooltip.style.top = Math.min(e.clientY + 15, window.innerHeight - 40) + 'px';
  }

  // Click handler
  function handleClick(e) {
    if (!isPickerActive) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (hoveredElement) {
      console.log('Element selected:', hoveredElement.tagName);
      
      // Extract code from the selected element
      const code = extractElementCode(hoveredElement);
      lastSelectedCode = code;
      
      // Store in session storage so popup can retrieve it
      try {
        sessionStorage.setItem('wf-extractor-code', JSON.stringify(code));
        sessionStorage.setItem('wf-extractor-timestamp', Date.now().toString());
      } catch (err) {
        console.error('Storage error:', err);
      }
      
      // Send to extension
      try {
        chrome.runtime.sendMessage({
          action: 'elementSelected',
          code: code
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Message sent (popup may be closed):', chrome.runtime.lastError.message);
          }
        });
      } catch (err) {
        console.log('Could not send message:', err);
      }

      // Stop picker after selection
      stopPicker();
      
      // Show brief confirmation
      showConfirmation();
    }

    return false;
  }

  // Show a brief confirmation that element was captured
  function showConfirmation() {
    const confirm = document.createElement('div');
    confirm.id = 'wf-extractor-confirm';
    confirm.innerHTML = '✓ Element captured! Open extension to see code.';
    confirm.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: wf-slide-in 0.3s ease;
    `;
    document.body.appendChild(confirm);
    
    setTimeout(() => {
      confirm.style.opacity = '0';
      confirm.style.transition = 'opacity 0.3s ease';
      setTimeout(() => confirm.remove(), 300);
    }, 2000);
  }

  // Extract element code
  function extractElementCode(element) {
    const html = extractHTML(element);
    const css = extractCSS(element);
    const formattedHTML = formatHTML(html);
    const formattedCSS = formatCSS(css);
    const reactCode = generateReactComponent(element, css);
    
    return {
      html: formattedHTML,
      css: formattedCSS,
      react: reactCode,
      combined: `<!-- HTML -->\n${formattedHTML}\n\n/* CSS */\n${formattedCSS}`
    };
  }

  // Generate React component from element
  function generateReactComponent(element, cssStyles) {
    const componentName = generateComponentName(element);
    const jsxContent = convertToJSX(element, options.includeChildren);
    const cssModule = generateCSSModule(cssStyles);
    const inlineStylesComponent = generateInlineStylesComponent(element, componentName);
    
    // Component with CSS Module
    const cssModuleComponent = `import React from 'react';
import styles from './${componentName}.module.css';

const ${componentName} = () => {
  return (
${indentCode(jsxContent, 4)}
  );
};

export default ${componentName};

// ============ ${componentName}.module.css ============
${cssModule}`;

    // Component with inline styles
    const styledComponent = `import React from 'react';

const ${componentName} = () => {
${inlineStylesComponent.styles}
  return (
${indentCode(inlineStylesComponent.jsx, 4)}
  );
};

export default ${componentName};`;

    return `// ========== Option 1: CSS Module Component ==========

${cssModuleComponent}


// ========== Option 2: Inline Styles Component ==========

${styledComponent}`;
  }

  // Generate a component name from element
  function generateComponentName(element) {
    if (element.id) {
      return toPascalCase(element.id);
    }
    if (element.className && typeof element.className === 'string') {
      const firstClass = element.className.split(' ')[0];
      if (firstClass) {
        return toPascalCase(firstClass.replace(/^w-/, ''));
      }
    }
    return toPascalCase(element.tagName.toLowerCase()) + 'Component';
  }

  // Convert string to PascalCase
  function toPascalCase(str) {
    return str
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .split(' ')
      .filter(word => word)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('') || 'Component';
  }

  // Convert HTML element to JSX
  function convertToJSX(element, includeChildren = true, depth = 0) {
    const indent = '  '.repeat(depth);
    const tagName = element.tagName.toLowerCase();
    
    // Self-closing tags
    const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
    
    // Convert attributes to JSX
    let attributes = [];
    for (const attr of element.attributes) {
      let name = attr.name;
      let value = attr.value;
      
      // Convert HTML attributes to JSX equivalents
      if (name === 'class') name = 'className';
      else if (name === 'for') name = 'htmlFor';
      else if (name === 'tabindex') name = 'tabIndex';
      else if (name === 'readonly') name = 'readOnly';
      else if (name === 'maxlength') name = 'maxLength';
      else if (name === 'cellspacing') name = 'cellSpacing';
      else if (name === 'cellpadding') name = 'cellPadding';
      else if (name === 'rowspan') name = 'rowSpan';
      else if (name === 'colspan') name = 'colSpan';
      else if (name === 'usemap') name = 'useMap';
      else if (name === 'frameborder') name = 'frameBorder';
      else if (name === 'contenteditable') name = 'contentEditable';
      else if (name === 'crossorigin') name = 'crossOrigin';
      else if (name === 'datetime') name = 'dateTime';
      else if (name === 'enctype') name = 'encType';
      else if (name === 'formaction') name = 'formAction';
      else if (name === 'formenctype') name = 'formEncType';
      else if (name === 'formmethod') name = 'formMethod';
      else if (name === 'formnovalidate') name = 'formNoValidate';
      else if (name === 'formtarget') name = 'formTarget';
      else if (name === 'hreflang') name = 'hrefLang';
      else if (name === 'inputmode') name = 'inputMode';
      else if (name === 'srcdoc') name = 'srcDoc';
      else if (name === 'srcset') name = 'srcSet';
      else if (name.startsWith('on')) name = name.replace(/^on/, 'on') + '';
      
      // Handle style attribute
      if (name === 'style') {
        const styleObj = parseInlineStyle(value);
        attributes.push(`style={${JSON.stringify(styleObj)}}`);
      } else if (name.startsWith('data-')) {
        attributes.push(`${name}="${value}"`);
      } else if (value === '' || value === name) {
        // Boolean attributes
        attributes.push(name);
      } else {
        attributes.push(`${name}="${value}"`);
      }
    }
    
    const attrString = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
    
    // Handle self-closing tags
    if (selfClosing.includes(tagName)) {
      return `${indent}<${tagName}${attrString} />`;
    }
    
    // Get children
    if (!includeChildren || element.children.length === 0) {
      const textContent = element.textContent.trim();
      if (textContent && element.children.length === 0) {
        return `${indent}<${tagName}${attrString}>${escapeJSX(textContent)}</${tagName}>`;
      }
      return `${indent}<${tagName}${attrString}></${tagName}>`;
    }
    
    // Process children
    let childrenJSX = [];
    for (const child of element.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        childrenJSX.push(convertToJSX(child, true, depth + 1));
      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (text) {
          childrenJSX.push('  '.repeat(depth + 1) + escapeJSX(text));
        }
      }
    }
    
    if (childrenJSX.length === 0) {
      return `${indent}<${tagName}${attrString}></${tagName}>`;
    }
    
    return `${indent}<${tagName}${attrString}>\n${childrenJSX.join('\n')}\n${indent}</${tagName}>`;
  }

  // Escape special characters for JSX
  function escapeJSX(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/{/g, '&#123;')
      .replace(/}/g, '&#125;');
  }

  // Parse inline style string to object
  function parseInlineStyle(styleString) {
    const styleObj = {};
    const declarations = styleString.split(';').filter(s => s.trim());
    
    for (const declaration of declarations) {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        // Convert CSS property to camelCase
        const camelProp = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styleObj[camelProp] = value;
      }
    }
    
    return styleObj;
  }

  // Generate CSS Module content
  function generateCSSModule(cssStyles) {
    return cssStyles.map(item => {
      // Convert selector to CSS module format
      let selector = item.selector;
      if (selector.startsWith('.')) {
        selector = selector.replace(/^\./, '.').replace(/\./g, '_');
      }
      return `${selector} {\n${item.styles}\n}`;
    }).join('\n\n');
  }

  // Generate component with inline styles
  function generateInlineStylesComponent(element, componentName) {
    const styles = {};
    const styledElements = [];
    
    function processElement(el, index = 0) {
      const styleObj = {};

      if (options.includeComputed) {
        const computed = window.getComputedStyle(el);
        const relevantProps = [
          'display', 'position', 'width', 'height', 'margin', 'padding',
          'backgroundColor', 'color', 'fontSize', 'fontWeight', 'fontFamily',
          'lineHeight', 'textAlign', 'border', 'borderRadius', 'boxShadow',
          'flexDirection', 'justifyContent', 'alignItems', 'gap'
        ];

        for (const prop of relevantProps) {
          const value = computed[prop];
          if (value && value !== 'none' && value !== 'normal' && value !== 'auto' &&
              value !== '0px' && value !== 'rgba(0, 0, 0, 0)' && value !== 'rgb(0, 0, 0)') {
            styleObj[prop] = value;
          }
        }
      } else if (el.getAttribute('style')) {
        Object.assign(styleObj, parseInlineStyle(el.getAttribute('style')));
      }

      if (Object.keys(styleObj).length > 0) {
        const styleName = `style${index || 'Container'}`;
        styles[styleName] = styleObj;
        styledElements.push({ element: el, styleName });
      }

      if (options.includeChildren) {
        Array.from(el.children).forEach((child, i) => processElement(child, index + i + 1));
      }
    }
    
    processElement(element);
    
    // Generate style declarations
    let styleDeclarations = '';
    for (const [name, obj] of Object.entries(styles)) {
      styleDeclarations += `  const ${name} = ${JSON.stringify(obj, null, 4).replace(/\n/g, '\n  ')};\n\n`;
    }
    
    // Generate JSX with style references
    const jsx = convertToJSXWithStyles(element, styles, options.includeChildren);
    
    return { styles: styleDeclarations, jsx };
  }

  // Convert to JSX with style object references
  function convertToJSXWithStyles(element, styles, includeChildren, depth = 0, styleIndex = { current: 0 }) {
    const indent = '  '.repeat(depth);
    const tagName = element.tagName.toLowerCase();
    const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'];
    
    let attributes = [];
    for (const attr of element.attributes) {
      let name = attr.name;
      let value = attr.value;
      
      if (name === 'class') name = 'className';
      else if (name === 'for') name = 'htmlFor';
      else if (name === 'style') continue; // Skip inline styles
      
      if (value === '' || value === name) {
        attributes.push(name);
      } else {
        attributes.push(`${name}="${value}"`);
      }
    }
    
    // Add style reference
    const styleName = styleIndex.current === 0 ? 'styleContainer' : `style${styleIndex.current}`;
    if (styles[styleName]) {
      attributes.push(`style={${styleName}}`);
    }
    styleIndex.current++;
    
    const attrString = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
    
    if (selfClosing.includes(tagName)) {
      return `${indent}<${tagName}${attrString} />`;
    }
    
    if (!includeChildren || element.children.length === 0) {
      const text = element.textContent.trim();
      if (text && element.children.length === 0) {
        return `${indent}<${tagName}${attrString}>${escapeJSX(text)}</${tagName}>`;
      }
      return `${indent}<${tagName}${attrString}></${tagName}>`;
    }
    
    let childrenJSX = [];
    for (const child of element.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        childrenJSX.push(convertToJSXWithStyles(child, styles, true, depth + 1, styleIndex));
      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (text) {
          childrenJSX.push('  '.repeat(depth + 1) + escapeJSX(text));
        }
      }
    }
    
    if (childrenJSX.length === 0) {
      return `${indent}<${tagName}${attrString}></${tagName}>`;
    }
    
    return `${indent}<${tagName}${attrString}>\n${childrenJSX.join('\n')}\n${indent}</${tagName}>`;
  }

  // Indent code helper
  function indentCode(code, spaces) {
    const indent = ' '.repeat(spaces);
    return code.split('\n').map(line => indent + line).join('\n');
  }

  // Extract HTML
  function extractHTML(element) {
    let html;
    
    if (options.includeChildren) {
      html = element.outerHTML;
    } else {
      const clone = element.cloneNode(false);
      html = clone.outerHTML;
    }

    if (options.cleanWebflow) {
      html = cleanWebflowHTML(html);
    }

    return html;
  }

  // Extract inline style attributes only (when computed styles are disabled)
  function extractInlineStylesOnly(element) {
    const styles = [];
    const processedElements = new Set();

    function processElement(el) {
      if (processedElements.has(el)) return;
      processedElements.add(el);

      const inlineStyle = el.getAttribute('style');
      if (inlineStyle && inlineStyle.trim()) {
        const selector = generateSelector(el);
        const cssText = inlineStyle
          .split(';')
          .map((declaration) => declaration.trim())
          .filter(Boolean)
          .map((declaration) => {
            const colonIndex = declaration.indexOf(':');
            if (colonIndex === -1) return null;
            const property = declaration.slice(0, colonIndex).trim();
            const value = declaration.slice(colonIndex + 1).trim();
            return property && value ? `  ${property}: ${value};` : null;
          })
          .filter(Boolean)
          .join('\n');

        if (cssText) {
          styles.push({ selector, styles: cssText });
        }
      }

      if (options.includeChildren) {
        Array.from(el.children).forEach((child) => processElement(child));
      }
    }

    processElement(element);
    return styles;
  }

  // Extract CSS
  function extractCSS(element) {
    if (!options.includeComputed) {
      return extractInlineStylesOnly(element);
    }

    const styles = [];
    const processedElements = new Set();

    function processElement(el) {
      if (processedElements.has(el)) return;
      processedElements.add(el);

      const selector = generateSelector(el);
      const computedStyle = window.getComputedStyle(el);
      const cssText = extractRelevantStyles(computedStyle);

      if (cssText) {
        styles.push({
          selector: selector,
          styles: cssText
        });
      }

      // Process pseudo-elements
      const beforeStyle = window.getComputedStyle(el, '::before');
      const afterStyle = window.getComputedStyle(el, '::after');
      
      if (beforeStyle.content && beforeStyle.content !== 'none') {
        styles.push({
          selector: selector + '::before',
          styles: extractRelevantStyles(beforeStyle)
        });
      }
      
      if (afterStyle.content && afterStyle.content !== 'none') {
        styles.push({
          selector: selector + '::after',
          styles: extractRelevantStyles(afterStyle)
        });
      }

      // Process children
      if (options.includeChildren) {
        Array.from(el.children).forEach(child => processElement(child));
      }
    }

    processElement(element);

    return styles;
  }

  // Generate CSS selector for element
  function generateSelector(element) {
    if (element.id) {
      return '#' + element.id;
    }

    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        // Clean Webflow-specific classes if option is enabled
        let filteredClasses = classes;
        if (options.cleanWebflow) {
          filteredClasses = classes.filter(c => !c.startsWith('w-') && !c.includes('webflow'));
        }
        if (filteredClasses.length > 0) {
          return '.' + filteredClasses.slice(0, 2).join('.');
        }
      }
    }

    return element.tagName.toLowerCase();
  }

  // Extract relevant CSS properties
  function extractRelevantStyles(computedStyle) {
    const relevantProperties = [
      'display', 'position', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'gap',
      'grid', 'grid-template-columns', 'grid-template-rows', 'grid-gap',
      'background', 'background-color', 'background-image', 'background-size', 'background-position',
      'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
      'border', 'border-radius', 'border-width', 'border-style', 'border-color',
      'box-shadow', 'opacity', 'overflow', 'z-index',
      'transform', 'transition', 'animation'
    ];

    const styles = [];
    const defaultStyles = getDefaultStyles(computedStyle);

    for (const prop of relevantProperties) {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== defaultStyles[prop] && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== '0px' && value !== 'rgba(0, 0, 0, 0)') {
        styles.push(`  ${prop}: ${value};`);
      }
    }

    return styles.join('\n');
  }

  // Get default styles to filter out
  function getDefaultStyles(computedStyle) {
    return {
      'display': 'block',
      'position': 'static',
      'opacity': '1',
      'z-index': 'auto'
    };
  }

  // Clean Webflow-specific HTML
  function cleanWebflowHTML(html) {
    // Remove Webflow-specific classes
    html = html.replace(/\bw-[a-z0-9-]+/gi, '');
    // Remove data-* attributes
    html = html.replace(/\sdata-[a-z-]+="[^"]*"/gi, '');
    // Clean up empty class attributes
    html = html.replace(/\sclass="\s*"/g, '');
    // Clean up multiple spaces
    html = html.replace(/\s+/g, ' ');
    return html;
  }

  // Format HTML with indentation
  function formatHTML(html) {
    let formatted = '';
    let indent = 0;
    const lines = html.replace(/></g, '>\n<').split('\n');

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Decrease indent for closing tags
      if (line.match(/^<\//) || line.match(/\/>/)) {
        if (line.match(/^<\//)) indent = Math.max(0, indent - 1);
      }

      formatted += '  '.repeat(indent) + line + '\n';

      // Increase indent for opening tags (not self-closing)
      if (line.match(/^<[^\/!]/) && !line.match(/\/>$/) && !line.match(/<\/[^>]+>$/)) {
        indent++;
      }
    }

    return formatted.trim();
  }

  // Format CSS
  function formatCSS(stylesArray) {
    return stylesArray.map(item => {
      return `${item.selector} {\n${item.styles}\n}`;
    }).join('\n\n');
  }

  // Extract full page
  function extractFullPage() {
    const bodyElement = document.body;
    
    // Get all stylesheets
    let allCSS = '';
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        for (const rule of rules) {
          allCSS += rule.cssText + '\n';
        }
      } catch (e) {
        // Cross-origin stylesheets will throw
        continue;
      }
    }

    const html = document.documentElement.outerHTML;
    const formattedBodyHTML = formatHTML(document.body.innerHTML);
    
    // Generate React component for the page
    const reactCode = generatePageReactComponent(document.body);
    
    return {
      html: formattedBodyHTML,
      css: allCSS || 'Unable to extract stylesheets (cross-origin restriction)',
      react: reactCode,
      combined: `<!DOCTYPE html>\n${html}`
    };
  }

  // Generate React component for full page
  function generatePageReactComponent(bodyElement) {
    const componentName = 'PageComponent';
    
    // Get main content areas
    const mainContent = bodyElement.querySelector('main') || 
                        bodyElement.querySelector('[role="main"]') || 
                        bodyElement.querySelector('.main') ||
                        bodyElement;
    
    const jsxContent = convertToJSX(mainContent, true);
    
    return `import React from 'react';
import './Page.css';

const ${componentName} = () => {
  return (
    <div className="page-wrapper">
${indentCode(jsxContent, 6)}
    </div>
  );
};

export default ${componentName};

// Note: Copy the CSS tab content to Page.css
// For a cleaner React structure, consider breaking this into smaller components.`;
  }

  // Start picker
  function startPicker() {
    console.log('Starting element picker');
    isPickerActive = true;
    document.body.classList.add('wf-picker-active');
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    overlay.style.display = 'block';
    tooltip.style.display = 'block';
  }

  // Stop picker
  function stopPicker() {
    console.log('Stopping element picker');
    isPickerActive = false;
    document.body.classList.remove('wf-picker-active');
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    overlay.style.display = 'none';
    tooltip.style.display = 'none';
    hoveredElement = null;
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message.action);
    
    if (message.action === 'togglePicker') {
      options = message.options || options;
      
      if (isPickerActive) {
        stopPicker();
      } else {
        startPicker();
      }
      
      sendResponse({ success: true, isActive: isPickerActive });
      return true;
    }
    
    if (message.action === 'getPickerState') {
      sendResponse({ isActive: isPickerActive });
      return true;
    }
    
    if (message.action === 'getLastCode') {
      sendResponse({ code: lastSelectedCode });
      return true;
    }
    
    if (message.action === 'extractFullPage') {
      options = message.options || options;
      const code = extractFullPage();
      sendResponse({ success: true, code: code });
      return true;
    }
    
    return true;
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    stopPicker();
    overlay.remove();
    tooltip.remove();
  });

  console.log('Webflow Code Extractor loaded');
})();
