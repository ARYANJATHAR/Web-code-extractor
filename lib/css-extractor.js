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

  const MAX_CSS_NODES = 800;

  function escapeCssIdent(ident) {
    try {
      if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(ident);
    } catch (err) {
      // fall through
    }
    return String(ident).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80) || 'el';
  }

  function generateSelector(element, options) {
    if (element.id) return '#' + escapeCssIdent(element.id);

    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        let filtered = classes;
        if (options.cleanWebflow) {
          filtered = classes.filter((c) => !c.startsWith('w-') && !c.includes('webflow'));
        }
        if (filtered.length > 0) {
          const base = '.' + filtered.slice(0, 2).map(escapeCssIdent).join('.');
          try {
            if (typeof document === 'undefined' || document.querySelectorAll(base).length <= 1) {
              return base;
            }
          } catch (err) {
            return base;
          }

          const path = [];
          let current = element;
          while (current && current.nodeType === 1) {
            let segment = current.tagName.toLowerCase();
            if (current === element) {
              segment += filtered.slice(0, 2).map(escapeCssIdent).map((c) => `.${c}`).join('');
            }
            const sameTag = current.parentElement
              ? Array.from(current.parentElement.children).filter((child) => child.tagName === current.tagName)
              : [];
            if (sameTag.length > 1) segment += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
            path.unshift(segment);
            if (current.id) break;
            current = current.parentElement;
          }
          return path.join(' > ');
        }
      }
    }

    return element.tagName ? element.tagName.toLowerCase() : 'div';
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
      let nodeCount = 0;

      function processElement(el) {
        if (processed.has(el) || nodeCount >= MAX_CSS_NODES) return;
        processed.add(el);
        nodeCount += 1;

        let inlineStyle = null;
        try {
          inlineStyle = el.getAttribute('style');
        } catch (err) {
          inlineStyle = null;
        }
        if (inlineStyle && inlineStyle.trim()) {
          const cssText = parseInlineStyleBlock(inlineStyle);
          if (cssText) {
            styles.push({ selector: generateSelector(el, options), styles: cssText });
          }
        }

        if (options.includeChildren && el.children) {
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
      let nodeCount = 0;
      let truncated = false;

      function safeGetComputed(el, pseudo) {
        try {
          return window.getComputedStyle(el, pseudo || null);
        } catch (err) {
          return null;
        }
      }

      function processElement(el) {
        if (processed.has(el) || truncated) return;
        processed.add(el);
        nodeCount += 1;
        if (nodeCount > MAX_CSS_NODES) {
          truncated = true;
          return;
        }

        const selector = generateSelector(el, options);
        const computedStyle = safeGetComputed(el);
        if (computedStyle) {
          const cssText = extractRelevantStyles(computedStyle);
          if (cssText) styles.push({ selector, styles: cssText });
        }

        const beforeStyle = safeGetComputed(el, '::before');
        if (beforeStyle) {
          try {
            const content = beforeStyle.getPropertyValue
              ? beforeStyle.getPropertyValue('content')
              : beforeStyle.content;
            if (content && content !== 'none' && content !== '""') {
              const beforeCss = extractRelevantStyles(beforeStyle);
              if (beforeCss) styles.push({ selector: selector + '::before', styles: beforeCss });
            }
          } catch (err) {
            // ignore pseudo-element errors
          }
        }
        const afterStyle = safeGetComputed(el, '::after');
        if (afterStyle) {
          try {
            const content = afterStyle.getPropertyValue
              ? afterStyle.getPropertyValue('content')
              : afterStyle.content;
            if (content && content !== 'none' && content !== '""') {
              const afterCss = extractRelevantStyles(afterStyle);
              if (afterCss) styles.push({ selector: selector + '::after', styles: afterCss });
            }
          } catch (err) {
            // ignore pseudo-element errors
          }
        }

        if (options.includeChildren && el.children) {
          const children = Array.from(el.children);
          for (const child of children) {
            if (truncated) break;
            processElement(child);
          }
        }
      }

      processElement(element);
      if (truncated) {
        styles.push({
          selector: '/* note */',
          styles: `  /* ... truncated after ${MAX_CSS_NODES} nodes: use element picker on a smaller subtree ... */`
        });
      }
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
