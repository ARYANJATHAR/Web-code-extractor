(function (global) {
  const WEBFLOW_CLASS_MAP = {
    'w-layout-grid': 'grid-container',
    'w-layout-cell': 'grid-cell',
    'w-container': 'container',
    'w-row': 'row',
    'w-col': 'column',
    'w-richtext': 'rich-text',
    'w-embed': 'embed',
    'w-form': 'form',
    'w-input': 'form-input',
    'w-button': 'button',
    'w-nav': 'navigation',
    'w-dropdown': 'dropdown',
    'w-slider': 'slider',
    'w-lightbox': 'lightbox',
    'w-tabs': 'tabs',
    'w-background-video': 'background-video',
    'w-video': 'video',
    'w-dyn-list': 'dynamic-list',
    'w-dyn-item': 'dynamic-item',
    'w-condition-invisible': 'conditional-hidden'
  };

  function mapWebflowClass(className) {
    if (WEBFLOW_CLASS_MAP[className]) {
      return WEBFLOW_CLASS_MAP[className];
    }
    if (className.startsWith('w-')) {
      return className.replace(/^w-/, 'wf-');
    }
    return className;
  }

  function extractWebflowClasses(html) {
    const found = new Set();
    const matches = html.match(/\bw-[a-z0-9-]+/gi) || [];
    matches.forEach((cls) => found.add(cls.toLowerCase()));
    return Array.from(found);
  }

  function buildClassMappingTable(html) {
    const classes = extractWebflowClasses(html);
    const mappings = classes.map((original) => ({
      original,
      mapped: mapWebflowClass(original),
      semantic: WEBFLOW_CLASS_MAP[original] || 'custom-webflow-class'
    }));

    return {
      mappings,
      summary: mappings.map((m) => `${m.original} → ${m.mapped} (${m.semantic})`).join('\n')
    };
  }

  function applyMappingToHTML(html) {
    let result = html;
    const classes = extractWebflowClasses(html);
    classes.forEach((original) => {
      const mapped = mapWebflowClass(original);
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      result = result.replace(regex, mapped);
    });
    return result;
  }

  function formatMappingOutput(table) {
    if (!table.mappings.length) {
      return 'No Webflow classes (w-*) detected in this extraction.';
    }

    const lines = ['Webflow Class Mapping', '====================', ''];
    table.mappings.forEach((m) => {
      lines.push(`${m.original}`);
      lines.push(`  → ${m.mapped}`);
      lines.push(`  semantic: ${m.semantic}`);
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  const api = {
    WEBFLOW_CLASS_MAP,
    mapWebflowClass,
    extractWebflowClasses,
    buildClassMappingTable,
    applyMappingToHTML,
    formatMappingOutput
  };

  global.WfExtractor = global.WfExtractor || {};
  Object.assign(global.WfExtractor, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
