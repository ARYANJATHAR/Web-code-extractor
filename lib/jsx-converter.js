(function (global) {
  const SELF_CLOSING = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];

  const ATTR_MAP = {
    class: 'className',
    for: 'htmlFor',
    tabindex: 'tabIndex',
    readonly: 'readOnly',
    maxlength: 'maxLength',
    cellspacing: 'cellSpacing',
    cellpadding: 'cellPadding',
    rowspan: 'rowSpan',
    colspan: 'colSpan',
    usemap: 'useMap',
    frameborder: 'frameBorder',
    contenteditable: 'contentEditable',
    crossorigin: 'crossOrigin',
    datetime: 'dateTime',
    enctype: 'encType',
    formaction: 'formAction',
    formenctype: 'formEncType',
    formmethod: 'formMethod',
    formnovalidate: 'formNoValidate',
    formtarget: 'formTarget',
    hreflang: 'hrefLang',
    inputmode: 'inputMode',
    srcdoc: 'srcDoc',
    srcset: 'srcSet',
    'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'stroke-miterlimit': 'strokeMiterlimit',
    'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset',
    'stroke-opacity': 'strokeOpacity',
    'fill-rule': 'fillRule',
    'fill-opacity': 'fillOpacity',
    'clip-path': 'clipPath',
    'clip-rule': 'clipRule',
    'stop-color': 'stopColor',
    'stop-opacity': 'stopOpacity',
    'dominant-baseline': 'dominantBaseline',
    'text-anchor': 'textAnchor',
    viewbox: 'viewBox',
    preserveaspectratio: 'preserveAspectRatio',
    'xlink:href': 'xlinkHref',
    'xml:space': 'xmlSpace'
  };

  function toPascalCase(str) {
    return str
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .split(' ')
      .filter((word) => word)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('') || 'Component';
  }

  function escapeJSX(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/{/g, '&#123;')
      .replace(/}/g, '&#125;');
  }

  function escapeAttrValue(value) {
    // Keep generated JSX syntactically safe on any website:
    // a quote in page HTML must not break out of the JSX "..." string.
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function parseInlineStyle(styleString) {
    const styleObj = {};
    const declarations = styleString.split(';').filter((s) => s.trim());

    for (const declaration of declarations) {
      const colonIndex = declaration.indexOf(':');
      if (colonIndex === -1) continue;
      const property = declaration.slice(0, colonIndex).trim();
      const value = declaration.slice(colonIndex + 1).trim();
      if (property && value) {
        const camelProp = property.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        styleObj[camelProp] = value;
      }
    }

    return styleObj;
  }

  function mapAttributeName(name) {
    return ATTR_MAP[name] || ATTR_MAP[String(name).toLowerCase()] || name;
  }

  function indentCode(code, spaces) {
    const indent = ' '.repeat(spaces);
    return code.split('\n').map((line) => indent + line).join('\n');
  }

  function generateComponentName(element) {
    const safeName = (value) => {
      const name = toPascalCase(value);
      return /^[0-9]/.test(name) ? `Component${name}` : name;
    };
    if (element.id) return safeName(element.id);
    if (element.className && typeof element.className === 'string') {
      const firstClass = element.className.split(' ')[0];
      if (firstClass) return safeName(firstClass.replace(/^w-/, ''));
    }
    return safeName(element.tagName.toLowerCase()) + 'Component';
  }

  function convertToJSX(element, includeChildren = true, depth = 0) {
    const indent = '  '.repeat(depth);
    const tagName = element.tagName.toLowerCase();
    const attributes = [];

    for (const attr of element.attributes) {
      let name = attr.name;
      const value = attr.value;
      name = mapAttributeName(name);

      if (name === 'style') {
        attributes.push(`style={${JSON.stringify(parseInlineStyle(value))}}`);
      } else if (name.startsWith('data-')) {
        attributes.push(`${name}="${escapeAttrValue(value)}"`);
      } else if (value === '' || value === attr.name) {
        attributes.push(name);
      } else {
        attributes.push(`${name}="${escapeAttrValue(value)}"`);
      }
    }

    const attrString = attributes.length > 0 ? ' ' + attributes.join(' ') : '';

    if (SELF_CLOSING.includes(tagName)) {
      return `${indent}<${tagName}${attrString} />`;
    }

    if (!includeChildren || element.children.length === 0) {
      const textContent = element.textContent.trim();
      if (textContent && element.children.length === 0) {
        return `${indent}<${tagName}${attrString}>${escapeJSX(textContent)}</${tagName}>`;
      }
      return `${indent}<${tagName}${attrString}></${tagName}>`;
    }

    const childrenJSX = [];
    for (const child of element.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        childrenJSX.push(convertToJSX(child, true, depth + 1));
      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (text) childrenJSX.push('  '.repeat(depth + 1) + escapeJSX(text));
      }
    }

    if (childrenJSX.length === 0) {
      return `${indent}<${tagName}${attrString}></${tagName}>`;
    }

    return `${indent}<${tagName}${attrString}>\n${childrenJSX.join('\n')}\n${indent}</${tagName}>`;
  }

  function convertToJSXWithStyles(element, styles, includeChildren, depth = 0, styleIndex = { current: 0 }) {
    const indent = '  '.repeat(depth);
    const tagName = element.tagName.toLowerCase();
    const attributes = [];

    for (const attr of element.attributes) {
      let name = attr.name;
      const value = attr.value;
      if (name === 'class') name = 'className';
      else if (name === 'for') name = 'htmlFor';
      else if (name === 'style') continue;
      else name = mapAttributeName(name);

      if (value === '' || value === name) {
        attributes.push(name);
      } else {
        attributes.push(`${name}="${escapeAttrValue(value)}"`);
      }
    }

    const styleName = styleIndex.current === 0 ? 'styleContainer' : `style${styleIndex.current}`;
    if (styles[styleName]) attributes.push(`style={${styleName}}`);
    styleIndex.current++;

    const attrString = attributes.length > 0 ? ' ' + attributes.join(' ') : '';

    if (SELF_CLOSING.includes(tagName)) {
      return `${indent}<${tagName}${attrString} />`;
    }

    if (!includeChildren || element.children.length === 0) {
      const text = element.textContent.trim();
      if (text && element.children.length === 0) {
        return `${indent}<${tagName}${attrString}>${escapeJSX(text)}</${tagName}>`;
      }
      return `${indent}<${tagName}${attrString}></${tagName}>`;
    }

    const childrenJSX = [];
    for (const child of element.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        childrenJSX.push(convertToJSXWithStyles(child, styles, true, depth + 1, styleIndex));
      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (text) childrenJSX.push('  '.repeat(depth + 1) + escapeJSX(text));
      }
    }

    if (childrenJSX.length === 0) {
      return `${indent}<${tagName}${attrString}></${tagName}>`;
    }

    return `${indent}<${tagName}${attrString}>\n${childrenJSX.join('\n')}\n${indent}</${tagName}>`;
  }

  const api = {
    toPascalCase,
    escapeJSX,
    escapeAttrValue,
    parseInlineStyle,
    mapAttributeName,
    indentCode,
    generateComponentName,
    convertToJSX,
    convertToJSXWithStyles
  };

  global.WfExtractor = global.WfExtractor || {};
  Object.assign(global.WfExtractor, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
