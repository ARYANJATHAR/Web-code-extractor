# Webflow Code Extractor

A Chrome extension that extracts HTML, CSS, React, Tailwind, and Webflow class mappings from Webflow designs and any webpage.

## Features

- **Element Picker** — Click any element to extract its code
- **Full Page Extraction** — Extract entire page HTML and stylesheets
- **Multiple Output Formats** — HTML, CSS, React, Tailwind, Webflow class mapping, Combined
- **Extraction History** — Last 10 extractions saved via `chrome.storage`
- **Customizable Options**:
  - Include/exclude child elements
  - Include computed styles (or inline-only)
  - Clean Webflow classes

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

> Icons ship as SVG source files. If Chrome shows a default icon, open `icons/generate-icons.html`, save PNGs locally, and update `manifest.json` paths.

## Usage

1. Navigate to a Webflow site or any webpage
2. Click the extension icon
3. Use **Start Element Picker** or **Extract Full Page**
4. Switch tabs: HTML, CSS, React, Tailwind, Mapped, Combined
5. Click **Copy** or reload from **Extraction History**

## Architecture

```
Web-code-extractor/
├── LICENSE
├── package.json
├── manifest.json
├── lib/
│   ├── html-formatter.js      # HTML/CSS formatting
│   ├── webflow-mapper.js      # Webflow class → semantic names
│   ├── jsx-converter.js       # DOM → JSX conversion
│   ├── css-extractor.js       # Computed/inline CSS extraction
│   ├── tailwind-converter.js  # CSS → Tailwind utilities
│   ├── react-generator.js     # React component generation
│   ├── messaging.js           # Retry messaging (popup)
│   └── storage.js             # Extraction history (popup)
├── content/content.js         # Picker UI + orchestration
├── background/background.js   # Context menu + injection
├── popup/                     # Extension popup UI
├── tests/                     # Node unit tests
└── icons/                     # SVG icon sources
```

## Development

Run unit tests:

```bash
npm test
```

## Options

- **Include child elements** — `outerHTML` vs element-only
- **Include computed styles** — `getComputedStyle` vs inline `style` only
- **Clean Webflow classes** — Remove `w-*` classes and `data-*` attributes

## Permissions

- `activeTab` — Access current tab for extraction
- `scripting` — Inject content scripts
- `clipboardWrite` — Copy code to clipboard
- `contextMenus` — Right-click "Extract Element Code"
- `storage` — Save extraction history

## Notes

- Works best on Webflow-published sites
- Cross-origin stylesheets may not be extractable (browser security)
- Repository uses SVG icons only (no binary PNGs)

## License

MIT License — see [LICENSE](LICENSE).
