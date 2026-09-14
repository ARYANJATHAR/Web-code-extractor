(function (global) {
  function cleanWebflowHTML(html, mapper) {
    if (mapper && mapper.applyMappingToHTML) {
      html = mapper.applyMappingToHTML(html);
    }
    html = html.replace(/\bw-[a-z0-9-]+/gi, '');
    html = html.replace(/\sdata-[a-z-]+="[^"]*"/gi, '');
    html = html.replace(/\sclass="\s*"/g, '');
    html = html.replace(/\s+/g, ' ');
    return html;
  }

  function formatHTML(html) {
    let formatted = '';
    let indent = 0;
    const lines = html.replace(/></g, '>\n<').split('\n');

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.match(/^<\//) || line.match(/\/>/)) {
        if (line.match(/^<\//)) indent = Math.max(0, indent - 1);
      }

      formatted += '  '.repeat(indent) + line + '\n';

      if (line.match(/^<[^\/!]/) && !line.match(/\/>$/) && !line.match(/<\/[^>]+>$/)) {
        indent++;
      }
    }

    return formatted.trim();
  }

  function formatCSS(stylesArray) {
    return stylesArray.map((item) => `${item.selector} {\n${item.styles}\n}`).join('\n\n');
  }

  const api = { cleanWebflowHTML, formatHTML, formatCSS };
  global.WfExtractor = global.WfExtractor || {};
  Object.assign(global.WfExtractor, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
