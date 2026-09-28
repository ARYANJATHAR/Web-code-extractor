(function (global) {
  const DISPLAY_MAP = {
    flex: 'flex',
    'inline-flex': 'inline-flex',
    grid: 'grid',
    block: 'block',
    'inline-block': 'inline-block',
    hidden: 'hidden',
    none: 'hidden'
  };

  const FLEX_DIRECTION_MAP = {
    row: 'flex-row',
    column: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'column-reverse': 'flex-col-reverse'
  };

  const JUSTIFY_MAP = {
    'flex-start': 'justify-start',
    'flex-end': 'justify-end',
    center: 'justify-center',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly'
  };

  const ALIGN_MAP = {
    'flex-start': 'items-start',
    'flex-end': 'items-end',
    center: 'items-center',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  };

  const TEXT_ALIGN_MAP = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify'
  };

  function parseCssDeclarations(cssText) {
    const declarations = {};
    const lines = cssText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim().replace(/;$/, '');
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      const prop = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      if (prop && value) declarations[prop] = value;
    }

    return declarations;
  }

  function convertDeclarationsToTailwind(declarations) {
    const classes = [];

    if (declarations.display && DISPLAY_MAP[declarations.display]) {
      classes.push(DISPLAY_MAP[declarations.display]);
    }

    if (declarations['flex-direction'] && FLEX_DIRECTION_MAP[declarations['flex-direction']]) {
      classes.push(FLEX_DIRECTION_MAP[declarations['flex-direction']]);
    }

    if (declarations['justify-content'] && JUSTIFY_MAP[declarations['justify-content']]) {
      classes.push(JUSTIFY_MAP[declarations['justify-content']]);
    }

    if (declarations['align-items'] && ALIGN_MAP[declarations['align-items']]) {
      classes.push(ALIGN_MAP[declarations['align-items']]);
    }

    if (declarations['text-align'] && TEXT_ALIGN_MAP[declarations['text-align']]) {
      classes.push(TEXT_ALIGN_MAP[declarations['text-align']]);
    }

    if (declarations.gap && declarations.gap !== '0px') {
      classes.push(`gap-[${declarations.gap}]`);
    }

    const weight = String(declarations['font-weight'] || '').toLowerCase();
    if (weight === '700' || weight === 'bold') {
      classes.push('font-bold');
    } else if (weight === '600') {
      classes.push('font-semibold');
    } else if (weight === '500' || weight === 'medium') {
      classes.push('font-medium');
    } else if (weight === '800' || weight === 'extrabold') {
      classes.push('font-extrabold');
    } else if (weight === '400' || weight === 'normal') {
      classes.push('font-normal');
    }

    if (declarations['border-radius'] && declarations['border-radius'] !== '0px') {
      classes.push(`rounded-[${declarations['border-radius']}]`);
    }

    if (declarations.opacity && declarations.opacity !== '1') {
      classes.push(`opacity-[${declarations.opacity}]`);
    }

    const ARBITRARY_MAP = {
      margin: 'm',
      'margin-top': 'mt',
      'margin-right': 'mr',
      'margin-bottom': 'mb',
      'margin-left': 'ml',
      padding: 'p',
      'padding-top': 'pt',
      'padding-right': 'pr',
      'padding-bottom': 'pb',
      'padding-left': 'pl',
      width: 'w',
      height: 'h',
      'min-width': 'min-w',
      'max-width': 'max-w',
      'min-height': 'min-h',
      'max-height': 'max-h',
      color: 'text',
      'background-color': 'bg',
      'font-size': 'text'
    };

    Object.keys(ARBITRARY_MAP).forEach((prop) => {
      const value = declarations[prop];
      if (value && value !== '0px' && value !== 'auto' && value !== 'none' && value !== 'normal') {
        classes.push(`${ARBITRARY_MAP[prop]}-[${value}]`);
      }
    });

    return classes;
  }

  function convertCssBlockToTailwind(selector, cssText) {
    const declarations = parseCssDeclarations(cssText);
    const classes = convertDeclarationsToTailwind(declarations);
    if (!classes.length) return null;
    return { selector, classes: classes.join(' ') };
  }

  function convertStylesToTailwind(stylesArray) {
    const results = [];

    for (const item of stylesArray) {
      const converted = convertCssBlockToTailwind(item.selector, item.styles);
      if (converted) results.push(converted);
    }

    return results;
  }

  function formatTailwindOutput(results) {
    if (!results.length) {
      return '/* No Tailwind utilities could be inferred from extracted styles */';
    }

    const lines = ['<!-- Tailwind class suggestions (apply to matching elements) -->', ''];

    results.forEach((item) => {
      lines.push(`/* ${item.selector} */`);
      lines.push(`class="${item.classes}"`);
      lines.push('');
    });

    return lines.join('\n').trim();
  }

  const api = {
    parseCssDeclarations,
    convertDeclarationsToTailwind,
    convertCssBlockToTailwind,
    convertStylesToTailwind,
    formatTailwindOutput
  };

  global.WfExtractor = global.WfExtractor || {};
  Object.assign(global.WfExtractor, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
