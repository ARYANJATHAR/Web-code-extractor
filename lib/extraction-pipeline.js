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

  function runFullPageExtraction() {
    let allCSS = '';
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        for (const rule of rules) {
          allCSS += rule.cssText + '\n';
        }
      } catch (err) {
        continue;
      }
    }

    const html = document.documentElement.outerHTML;
    const formattedBodyHTML = WE.formatHTML(document.body.innerHTML);
    const mappingTable = WE.buildClassMappingTable(document.body.innerHTML);

    return {
      html: formattedBodyHTML,
      css: allCSS || 'Unable to extract stylesheets (cross-origin restriction)',
      react: WE.generatePageReactComponent(document.body),
      tailwind: '/* Use element picker for Tailwind class suggestions per component */',
      mapped: WE.formatMappingOutput(mappingTable),
      combined: `<!DOCTYPE html>\n${html}`
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
