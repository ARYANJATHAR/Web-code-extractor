(function (global) {
  const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  function cleanWebflowHTML(html, mapper) {
    let out = String(html || '');
    if (mapper && mapper.applyMappingToHTML) {
      out = mapper.applyMappingToHTML(out);
    }
    // Only strip w-* tokens inside class="..." / class='...', never text nodes.
    out = out.replace(/class\s*=\s*(["'])(.*?)\1/gi, (match, quote, cls) => {
      const kept = cls.split(/\s+/).filter((c) => c && !/^w-[a-z0-9-]+$/i.test(c));
      return kept.length ? `class=${quote}${kept.join(' ')}${quote}` : '';
    });
    // Remove data-* attributes with double or single quotes, or bare values.
    out = out.replace(/\sdata-[a-z0-9-_]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, '');
    out = out.replace(/\sclass\s*=\s*(["'])\s*\1/g, '');
    out = out.replace(/<[a-z0-9]+\s+>/gi, (m) => m.replace(/\s+>/, '>'));
    return out.trim();
  }

  function formatHTML(html) {
    const source = String(html || '');
    // Protect pre/script/style/textarea so internal >< is not split.
    const protectedBlocks = [];
    const protectedHtml = source.replace(
      /<(pre|script|style|textarea)[\s\S]*?<\/\1\s*>/gi,
      (m) => {
        protectedBlocks.push(m);
        return `@@WFBLOCK${protectedBlocks.length - 1}@@`;
      }
    );

    let formatted = '';
    let indent = 0;
    const lines = protectedHtml.replace(/></g, '>\n<').split('\n');

    for (let rawLine of lines) {
      let line = rawLine.trim();
      if (!line) continue;

      // Restore protected blocks inline (placeholder may share a line
      // with surrounding tags, e.g. <div>@@WFBLOCK0@@<br>).
      if (line.includes('@@WFBLOCK')) {
        line = line.replace(/@@WFBLOCK(\d+)@@/g, (m, n) => protectedBlocks[Number(n)] || m);
        formatted += '  '.repeat(indent) + line + '\n';
        continue;
      }

      // Comments / doctype: no indent change.
      if (/^<!--/.test(line) || /^<!/.test(line) && !/^<!--/.test(line)) {
        formatted += '  '.repeat(indent) + line + '\n';
        continue;
      }

      if (/^<\//.test(line)) {
        indent = Math.max(0, indent - 1);
        formatted += '  '.repeat(indent) + line + '\n';
        continue;
      }

      formatted += '  '.repeat(indent) + line + '\n';

      // Open tag increases indent unless void, self-closing, or
      // open+close on the same line.
      const openMatch = line.match(/^<([a-z0-9-]+)/i);
      if (openMatch) {
        const tag = openMatch[1].toLowerCase();
        const selfClosing = /\/>\s*$/.test(line);
        const openAndClose = new RegExp(`<${tag}[^>]*>[\\s\\S]*<\\/${tag}\\s*>\\s*$`, 'i').test(line);
        if (!selfClosing && !openAndClose && !VOID_ELEMENTS.has(tag)) {
          indent++;
        }
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
