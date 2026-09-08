# Webflow Code Extractor

A Chrome extension that extracts HTML and CSS code from Webflow designs and any webpage.

## Features

- 🎯 **Element Picker** - Click on any element to extract its code
- 📄 **Full Page Extraction** - Extract the entire page's HTML and CSS
- 📋 **One-Click Copy** - Easily copy generated code to clipboard
- ⚙️ **Customizable Options**:
  - Include/exclude child elements
  - Include computed styles
  - Clean Webflow-specific classes

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right corner)
3. Click **Load unpacked**
4. Select the `Extension` folder
5. The extension icon will appear in your toolbar

## Usage

1. Navigate to any Webflow site or webpage
2. Click the extension icon in Chrome toolbar
3. Choose an action:
   - **Start Element Picker**: Click to select an element on the page
   - **Extract Full Page**: Get the entire page's code
4. View the extracted code in the popup (HTML, CSS, or Combined)
5. Click **Copy** to copy the code to your clipboard

## Options

- **Include child elements**: When enabled, extracts all nested elements
- **Include computed styles**: Extracts the actual rendered CSS properties
- **Clean Webflow classes**: Removes Webflow-specific class names (w-*, etc.)

## File Structure

```
Extension/
├── manifest.json          # Extension configuration
├── background/
│   └── background.js      # Service worker
├── content/
│   ├── content.js         # Content script (element picker)
│   └── content.css        # Overlay styles
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
└── icons/
    ├── icon16.png         # 16x16 icon
    ├── icon48.png         # 48x48 icon
    └── icon128.png        # 128x128 icon
```

## Creating Custom Icons

1. Open `icons/generate-icons.html` in Chrome
2. Right-click each canvas and save as PNG
3. Replace the existing icon files

## Permissions

- `activeTab`: Access the current tab to extract code
- `scripting`: Inject content scripts
- `clipboardWrite`: Copy code to clipboard

## Notes

- Works best on Webflow-published sites
- Some cross-origin stylesheets may not be extractable due to browser security
- For production use, replace placeholder icons with custom designs

## License

MIT License
