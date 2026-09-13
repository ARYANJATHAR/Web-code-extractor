# Webflow Code Extractor

A Chrome extension that extracts HTML and CSS code from Webflow designs and any webpage.

## Features

- **Element Picker** - Click on any element to extract its code
- **Full Page Extraction** - Extract the entire page's HTML and CSS
- **One-Click Copy** - Easily copy generated code to clipboard
- **Customizable Options**:
  - Include/exclude child elements
  - Include computed styles
  - Clean Webflow-specific classes

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right corner)
3. Click **Load unpacked**
4. Select this project folder
5. The extension icon will appear in your toolbar

> **Note:** Icons ship as SVG source files. If Chrome shows a default puzzle-piece icon, open `icons/generate-icons.html`, save the PNGs, and update `manifest.json` to reference them.

## Usage

1. Navigate to any Webflow site or webpage
2. Click the extension icon in Chrome toolbar
3. Choose an action:
   - **Start Element Picker**: Click to select an element on the page
   - **Extract Full Page**: Get the entire page's code
4. View the extracted code in the popup (HTML, CSS, React, or Combined)
5. Click **Copy** to copy the code to your clipboard

## Options

- **Include child elements**: When enabled, extracts all nested elements
- **Include computed styles**: Extracts rendered CSS via `getComputedStyle`; when disabled, only inline `style` attributes are captured
- **Clean Webflow classes**: Removes Webflow-specific class names (`w-*`, etc.)

## File Structure

```
Web-code-extractor/
├── LICENSE                # MIT license
├── manifest.json          # Extension configuration
├── background/
│   └── background.js      # Service worker
├── content/
│   ├── content.js         # Content script (element picker + extraction)
│   └── content.css        # Overlay styles
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── icons/
│   ├── icon16.svg         # 16x16 icon (source)
│   ├── icon48.svg         # 48x48 icon (source)
│   ├── icon128.svg        # 128x128 icon (source)
│   └── generate-icons.html
└── scripts/
    └── package-listing.ps1  # Build a listing-ready zip
```

## Creating PNG Icons (optional)

Chrome may require raster icons in some setups:

1. Open `icons/generate-icons.html` in Chrome
2. Right-click each canvas and save as `icon16.png`, `icon48.png`, `icon128.png`
3. Update `manifest.json` icon paths from `.svg` to `.png`

## Packaging for Distribution

To create a clean source archive (no `.git`, no binary images, no internal QC notes):

```powershell
.\scripts\package-listing.ps1
```

Output: `dist/Web-code-extractor-listing.zip`

The script excludes:

- `.git/` and git metadata
- Binary images (`.png`, `.jpg`, etc.)
- `qualitychecks.md` and build artifacts

## Permissions

- `activeTab`: Access the current tab to extract code
- `scripting`: Inject content scripts
- `clipboardWrite`: Copy code to clipboard
- `contextMenus`: Right-click "Extract Element Code"

## Notes

- Works best on Webflow-published sites
- Some cross-origin stylesheets may not be extractable due to browser security
- SVG icons are included as editable source; generate PNGs if your Chrome build requires them

## License

MIT License — see [LICENSE](LICENSE).
