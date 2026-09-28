(function (global) {
  const WE = global.WfExtractor;

  function runElementExtraction(element, options) {
    const cssExtractor = WE.createCssExtractor(options);
    const rawHtml = extractRawHtml(element, options);
    const css = cssExtractor.extractCSS(element);
    const formattedHTML = WE.formatHTML(rawHtml);
    const formattedCSS = WE.formatCSS(css);
    const reactCode = WE.generateReactComponent(element, css, options);
    const mappingTable = WE.buildClassMappingTable(rawHtml);
    const tailwindResults = WE.convertStylesToTailwind(css);

    return {
      html: formattedHTML,
      css: formattedCSS,
      react: reactCode,
      tailwind: WE.formatTailwindOutput(tailwindResults),
      mapped: WE.formatMappingOutput(mappingTable),
      combined: `<!-- HTML -->\n${formattedHTML}\n\n/* CSS */\n${formattedCSS}`
    };
  }

  function extractRawHtml(element, options) {
    let html = options.includeChildren ? element.outerHTML : element.cloneNode(false).outerHTML;
    if (options.cleanWebflow) {
      html = WE.cleanWebflowHTML(html, WE);
    }
    return html;
  }

  async function runElementExtractionWithPersistence(element, options, persistOptions = {}) {
    const code = runElementExtraction(element, options);
    const persistence = await WE.persistExtractionWithReconciliation(code, persistOptions);
    return { code, persistence };
  }

  const MAX_FULL_CSS_CHARS = 300000;
  const MAX_FULL_HTML_CHARS = 500000;

  function truncateWithNote(text, max, note) {
    const str = String(text || '');
    if (str.length <= max) return str;
    return str.slice(0, max) + `\n${note}`;
  }

  function runFullPageExtraction() {
    let allCSS = '';
    let cssTruncated = false;
    for (const sheet of document.styleSheets) {
      if (cssTruncated) break;
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (const rule of rules) {
          if (allCSS.length >= MAX_FULL_CSS_CHARS) {
            cssTruncated = true;
            break;
          }
          try {
            allCSS += rule.cssText + '\n';
          } catch (err) {
            continue;
          }
        }
      } catch (err) {
        continue;
      }
    }
    if (cssTruncated) {
      allCSS += '/* ... truncated: too many stylesheet rules for popup ... */\n';
    }

    const rawHtml = document.documentElement.outerHTML || '';
    const bodyHtml = document.body ? document.body.innerHTML : rawHtml;
    const formattedBodyHTML = truncateWithNote(
      WE.formatHTML(bodyHtml),
      MAX_FULL_HTML_CHARS,
      '<!-- ... truncated: page too large, use element picker for subtrees ... -->'
    );
    const mappingTable = WE.buildClassMappingTable(bodyHtml.slice(0, MAX_FULL_HTML_CHARS));

    return {
      html: formattedBodyHTML,
      css: allCSS || 'Unable to extract stylesheets (cross-origin restriction)',
      react: WE.generatePageReactComponent(document.body || document.documentElement),
      tailwind: '/* Use element picker for Tailwind class suggestions per component */',
      mapped: WE.formatMappingOutput(mappingTable),
      combined: truncateWithNote(
        `<!DOCTYPE html>\n${rawHtml}`,
        MAX_FULL_HTML_CHARS,
        '<!-- ... truncated ... -->'
      )
    };
  }

  const api = {
    runElementExtraction,
    runElementExtractionWithPersistence,
    runFullPageExtraction
  };

  global.WfExtractor = global.WfExtractor || {};
  Object.assign(global.WfExtractor, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
