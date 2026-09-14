(function (global) {
  function generateCSSModule(cssStyles) {
    return cssStyles.map((item) => {
      let selector = item.selector;
      if (selector.startsWith('.')) {
        selector = selector.replace(/^\./, '.').replace(/\./g, '_');
      }
      return `${selector} {\n${item.styles}\n}`;
    }).join('\n\n');
  }

  function generateInlineStylesComponent(element, componentName, options) {
    const { parseInlineStyle, convertToJSXWithStyles } = global.WfExtractor;
    const styles = {};

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
      }

      if (options.includeChildren) {
        Array.from(el.children).forEach((child, i) => processElement(child, index + i + 1));
      }
    }

    processElement(element);

    let styleDeclarations = '';
    for (const [name, obj] of Object.entries(styles)) {
      styleDeclarations += `  const ${name} = ${JSON.stringify(obj, null, 4).replace(/\n/g, '\n  ')};\n\n`;
    }

    const jsx = convertToJSXWithStyles(element, styles, options.includeChildren);
    return { styles: styleDeclarations, jsx };
  }

  function generateReactComponent(element, cssStyles, options) {
    const { generateComponentName, convertToJSX, indentCode } = global.WfExtractor;
    const componentName = generateComponentName(element);
    const jsxContent = convertToJSX(element, options.includeChildren);
    const cssModule = generateCSSModule(cssStyles);
    const inlineStylesComponent = generateInlineStylesComponent(element, componentName, options);

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

    const styledComponent = `import React from 'react';

const ${componentName} = () => {
${inlineStylesComponent.styles}  return (
${indentCode(inlineStylesComponent.jsx, 4)}
  );
};

export default ${componentName};`;

    return `// ========== Option 1: CSS Module Component ==========

${cssModuleComponent}


// ========== Option 2: Inline Styles Component ==========

${styledComponent}`;
  }

  function generatePageReactComponent(bodyElement) {
    const { convertToJSX, indentCode } = global.WfExtractor;
    const componentName = 'PageComponent';
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

  const api = {
    generateCSSModule,
    generateInlineStylesComponent,
    generateReactComponent,
    generatePageReactComponent
  };

  global.WfExtractor = global.WfExtractor || {};
  Object.assign(global.WfExtractor, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
