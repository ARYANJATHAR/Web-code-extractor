(function (global) {
  const RELEVANT_PROPERTIES = [
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'gap',
    'grid', 'grid-template-columns', 'grid-template-rows', 'grid-gap',
    'background', 'background-color', 'background-image', 'background-size', 'background-position',
    'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
    'text-align', 'text-decoration', 'text-transform',
    'border', 'border-radius', 'border-width', 'border-style', 'border-color',
    'box-shadow', 'opacity', 'overflow', 'z-index',
    'transform', 'transition', 'animation'
  ];

  const DEFAULT_STYLE_VALUES = {
    display: 'block',
    position: 'static',
    opacity: '1',
    'z-index': 'auto'
  };

  const SKIP_VALUES = new Set(['none', 'normal', 'auto', '0px', 'rgba(0, 0, 0, 0)']);

  function getDefaultStyles() {
    return { ...DEFAULT_STYLE_VALUES };
  }

  function extractRelevantStyles(computedStyle) {
    const styles = [];
    const defaults = getDefaultStyles();

    for (const prop of RELEVANT_PROPERTIES) {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== defaults[prop] && !SKIP_VALUES.has(value)) {
        styles.push(`  ${prop}: ${value};`);
      }
    }

    return styles.join('\n');
  }

  function generateSelector(element, options) {
    if (element.id) return '#' + element.id;

    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        let filtered = classes;
        if (options.cleanWebflow) {
          filtered = classes.filter((c) => !c.startsWith('w-') && !c.includes('webflow'));
        }
        if (filtered.length > 0) {
          return '.' + filtered.slice(0, 2).join('.');
        }
      }
    }

    return element.tagName.toLowerCase();
  }

  function parseInlineStyleBlock(inlineStyle) {
    return inlineStyle
      .split(';')
      .map((d) => d.trim())
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
  }

  function createCssExtractor(options) {
    function extractInlineStylesOnly(element) {
      const styles = [];
      const processed = new Set();

      function processElement(el) {
        if (processed.has(el)) return;
        processed.add(el);

        const inlineStyle = el.getAttribute('style');
        if (inlineStyle && inlineStyle.trim()) {
          const cssText = parseInlineStyleBlock(inlineStyle);
          if (cssText) {
            styles.push({ selector: generateSelector(el, options), styles: cssText });
          }
        }

        if (options.includeChildren) {
          Array.from(el.children).forEach((child) => processElement(child));
        }
      }

      processElement(element);
      return styles;
    }

    function extractCSS(element) {
      if (!options.includeComputed) return extractInlineStylesOnly(element);

      const styles = [];
      const processed = new Set();

      function processElement(el) {
        if (processed.has(el)) return;
        processed.add(el);

        const selector = generateSelector(el, options);
        const computedStyle = window.getComputedStyle(el);
        const cssText = extractRelevantStyles(computedStyle);

        if (cssText) styles.push({ selector, styles: cssText });

        const beforeStyle = window.getComputedStyle(el, '::before');
        const afterStyle = window.getComputedStyle(el, '::after');

        if (beforeStyle.content && beforeStyle.content !== 'none') {
          styles.push({ selector: selector + '::before', styles: extractRelevantStyles(beforeStyle) });
        }
        if (afterStyle.content && afterStyle.content !== 'none') {
          styles.push({ selector: selector + '::after', styles: extractRelevantStyles(afterStyle) });
        }

        if (options.includeChildren) {
          Array.from(el.children).forEach((child) => processElement(child));
        }
      }

      processElement(element);
      return styles;
    }

    return { extractCSS, extractInlineStylesOnly };
  }

  const api = {
    RELEVANT_PROPERTIES,
    getDefaultStyles,
    extractRelevantStyles,
    generateSelector,
    parseInlineStyleBlock,
    createCssExtractor
  };

  global.WfExtractor = global.WfExtractor || {};
  Object.assign(global.WfExtractor, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
