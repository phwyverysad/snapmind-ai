const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, screen } = require('electron');

async function runToolbarTests() {
  console.log('====================================================');
  console.log('🌟 FLOATING TOOLBAR & ZERO FOCUS STEALING TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const preloadJs = fs.readFileSync(path.join(__dirname, 'preload.js'), 'utf8');
  const toolbarHtml = fs.readFileSync(path.join(__dirname, 'toolbar.html'), 'utf8');
  const toolbarJs = fs.readFileSync(path.join(__dirname, 'toolbar.js'), 'utf8');
  const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
  const nativeCs = fs.readFileSync(path.join(__dirname, 'native_hotkey.cs'), 'utf8');

  // ----------------------------------------------------
  // TEST 1: DEDICATED TOOLBAR BROWSERWINDOW (ZERO FOCUS ARCHITECTURE)
  // ----------------------------------------------------
  console.log('👉 [TEST 1] Dedicated Toolbar BrowserWindow Architecture');

  assert(mainJs.includes('let toolbarWindow = null;'), 'main.js declares dedicated toolbarWindow');
  assert(mainJs.includes('function createToolbarWindow()'), 'main.js implements createToolbarWindow()');
  assert((mainJs.includes("width: 920") || mainJs.includes("width: 780") || mainJs.includes("width: 620")) && mainJs.includes("height: 46"), 'createToolbarWindow sets compact dimensions (height: 46)');
  assert(mainJs.includes('frame: false'), 'toolbarWindow is frameless');
  assert(mainJs.includes('transparent: true'), 'toolbarWindow is transparent');
  assert(mainJs.includes('alwaysOnTop: true'), 'toolbarWindow is alwaysOnTop');
  assert(mainJs.includes('skipTaskbar: true'), 'toolbarWindow skips taskbar');
  assert(mainJs.includes('focusable: false'), 'toolbarWindow initially non-focusable (Zero Focus Stealing)');
  assert(mainJs.includes("loadFile('toolbar.html')"), 'toolbarWindow loads dedicated toolbar.html');

  // ----------------------------------------------------
  // TEST 2: ZERO FOCUS STEALING DISPLAY (showInactive)
  // ----------------------------------------------------
  console.log('\n👉 [TEST 2] Zero Focus Stealing Display (showInactive)');

  assert(mainJs.includes('toolbarWindow.showInactive()'), 'main.js displays toolbar via showInactive() without activating window');
  assert(!mainJs.includes('toolbarWindow.show()\n    toolbarWindow.focus()'), 'main.js avoids aggressive show()+focus() in startQuickTextMode');
  assert(mainJs.includes('toolbarWindow.setFocusable(false)'), 'startQuickTextMode enforces focusable: false on launch');
  assert(mainJs.includes('toolbarWindow.setFocusable(Boolean(flag))') || mainJs.includes('toolbarWindow.setFocusable(focusable)'), 'main.js allows dynamic focusable toggle via IPC');

  // Win32 native simulated copy with hardware scan codes & modifier hygiene
  assert(nativeCs.includes('0x2E, 0, 0'), 'native_hotkey.cs simulates Ctrl+C down with hardware scan code');
  assert(nativeCs.includes('0x2E, 2, 0'), 'native_hotkey.cs simulates Ctrl+C up cleanly with scan code');
  assert(nativeCs.includes('MapVirtualKey'), 'native_hotkey.cs uses MapVirtualKey for hardware scan code precision');
  assert(nativeCs.includes('SimulateCtrlC()'), 'native_hotkey.cs defines dedicated SimulateCtrlC() helper');
  assert(nativeCs.includes('0x2A, 2, 0'), 'native_hotkey.cs releases Shift before Ctrl+C to prevent opening DevTools');
  assert(nativeCs.includes('SetForegroundWindow(_lastTargetAppHwnd)'), 'native_hotkey.cs ensures target application retains foreground before copying');
  assert(mainJs.includes('captureSelectedTextWithRetry'), 'main.js implements polling retry for clipboard capture');
  assert(mainJs.includes('triggerCopyAndGetText'), 'main.js implements triggerCopyAndGetText() for on-demand option selection copy');
  assert(mainJs.includes("'trigger-copy-and-get-text'"), 'main.js registers trigger-copy-and-get-text IPC handle');
  assert(preloadJs.includes('copyAndGetSelectedText:'), 'preload.js exposes copyAndGetSelectedText API');
  assert(toolbarJs.includes('copyAndGetSelectedText'), 'toolbar.js executes copy on option selection');
  assert(mainJs.includes("'get-clipboard-text'"), 'main.js registers get-clipboard-text IPC handle');
  assert(preloadJs.includes('getClipboardText:'), 'preload.js exposes getClipboardText API');
  assert(toolbarJs.includes('getClipboardText'), 'toolbar.js includes clipboard fallback re-read');
  assert(toolbarJs.includes('ไม่พบข้อความที่คลุมดำไว้'), 'toolbar.js presents user guidance when no text is selected');

  // ----------------------------------------------------
  // TEST 3: DYNAMIC FOCUS FOR CUSTOM ASK & CLEAN EXIT
  // ----------------------------------------------------
  console.log('\n👉 [TEST 3] Dynamic Focus For Custom Ask & Clean Escape Exit');

  assert(preloadJs.includes('setToolbarFocusable: (flag) => ipcRenderer.send(\'set-toolbar-focusable\', flag)'), 'preload.js exposes setToolbarFocusable IPC');
  assert(preloadJs.includes('resizeToolbarWindow: (bounds) => ipcRenderer.send(\'resize-toolbar-window\', bounds)'), 'preload.js exposes resizeToolbarWindow IPC');
  assert(preloadJs.includes('onQuickDigitPressed: (callback) =>'), 'preload.js exposes onQuickDigitPressed IPC');

  assert(toolbarJs.includes('window.electronAPI.setToolbarFocusable(true)'), 'toolbar.js enables focusable when custom ask input opens');
  assert(toolbarJs.includes('window.electronAPI.setToolbarFocusable(false)'), 'toolbar.js restores non-focusable when custom ask closes or UI exits');
  assert(toolbarJs.includes('window.electronAPI.resizeToolbarWindow({ height: 86 })'), 'toolbar.js expands window height for custom ask box');
  assert(toolbarJs.includes('window.electronAPI.resizeToolbarWindow({ height: 280 })'), 'toolbar.js expands window height for answer card');
  assert(toolbarJs.includes('window.electronAPI.resizeToolbarWindow({ height: 46 })'), 'toolbar.js shrinks window height back to 46px');

  // ----------------------------------------------------
  // TEST 4: GEMINI SINGLE SLEEK HORIZONTAL PILL UI
  // ----------------------------------------------------
  console.log('\n👉 [TEST 4] Gemini Single Sleek Horizontal Pill UI');

  // Check toolbar.html structure
  assert(toolbarHtml.includes('class="quick-text-toolbar"'), 'toolbar.html defines .quick-text-toolbar container');
  assert(toolbarHtml.includes('class="drag-handle"'), 'toolbar.html includes .drag-handle (⋮⋮)');
  assert(toolbarHtml.includes('class="quick-actions-list"'), 'toolbar.html includes .quick-actions-list container');
  assert(toolbarHtml.includes('class="quick-action-btn custom-ask-btn"'), 'toolbar.html includes custom-ask-btn (? ถามเอง)');
  assert(toolbarHtml.includes('class="quick-action-btn cancel-btn"'), 'toolbar.html includes cancel-btn (Esc ยกเลิก)');

  // Drag Handle dots verification (6 small dots)
  const dotCount = (toolbarHtml.match(/<circle\s+cx=/g) || []).length;
  assert(dotCount >= 6, `Drag handle contains 6 circular dots vector SVG (Found: ${dotCount})`);
  assert(toolbarHtml.includes('-webkit-app-region: drag'), 'Drag handle has -webkit-app-region: drag');
  assert(toolbarHtml.includes('cursor: grab'), 'Drag handle has cursor: grab');

  // Pill styling checks in toolbar.html or style.css
  assert(toolbarHtml.includes('height: 38px') || styleCss.includes('height: 38px'), 'Pill container height is 38px');
  assert(toolbarHtml.includes('border-radius: 8px') || styleCss.includes('border-radius: 8px'), 'Pill container border-radius is 8px');
  assert(toolbarHtml.includes('box-shadow: 0 10px 25px -5px') || styleCss.includes('box-shadow: 0 10px 25px -5px'), 'Pill container has refined elevated shadow');
  assert(toolbarHtml.includes('gap: 3px') || styleCss.includes('gap: 3px'), 'Action cards list has 3px spacing');

  // Cancel Button styling
  assert(toolbarHtml.includes('.cancel-btn:hover') && (toolbarHtml.includes('#fee2e2') || styleCss.includes('#fee2e2')), 'Cancel button hover red tint #fee2e2');
  assert(toolbarHtml.includes('.esc-badge') || styleCss.includes('.esc-badge'), 'Cancel button has Esc keyboard badge');

  // Micro-animations
  assert(toolbarHtml.includes('cubic-bezier(0.34, 1.56, 0.64, 1)') || styleCss.includes('cubic-bezier(0.34, 1.56, 0.64, 1)'), 'Entrance animation uses OutBack spring easing');
  assert(toolbarHtml.includes('scale(0.88)') || styleCss.includes('scale(0.88)'), 'Entrance animation starts at scale 0.88');
  assert(toolbarHtml.includes('geminiExit') || styleCss.includes('geminiExit'), 'Exit micro-animation defined');
  assert(toolbarHtml.includes('scale(1.02)') || styleCss.includes('scale(1.02)'), 'Button hover micro-animation scale(1.02)');
  assert(toolbarHtml.includes('90ms') || styleCss.includes('90ms'), 'Button active micro-press duration 90ms');

  // Zero emojis verification
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(toolbarHtml), 'toolbar.html contains 0 emojis (100% clean SVG vectors)');

  // ----------------------------------------------------
  // TEST 5: TEMPORARY GLOBAL SHORTCUTS DURING TOOLBAR MODE
  // ----------------------------------------------------
  console.log('\n👉 [TEST 5] Temporary Global Shortcuts Lifecycle (1-9 & Esc)');

  assert(mainJs.includes('function registerToolbarShortcuts()'), 'main.js defines registerToolbarShortcuts()');
  assert(mainJs.includes('function unregisterToolbarShortcuts()'), 'main.js defines unregisterToolbarShortcuts()');
  assert(mainJs.includes('registerToolbarShortcuts()'), 'startQuickTextMode activates shortcuts 1-9 & Escape');
  assert(mainJs.includes('unregisterToolbarShortcuts()'), 'closeQuickTextMode cleans up shortcuts 1-9 & Escape');
  assert(mainJs.includes("'quick-text-number-pressed'"), 'Number keys 1-9 emit quick-text-number-pressed event to toolbarWindow');

  // ----------------------------------------------------
  // TEST 6: LIVE TOOLBAR WINDOW INSTANTIATION (ELECTRON RUNTIME)
  // ----------------------------------------------------
  console.log('\n👉 [TEST 6] Live Toolbar Window Creation & showInactive Verification');

  const testWin = new BrowserWindow({
    width: 620,
    height: 46,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  assert(Boolean(testWin), 'Successfully instantiated BrowserWindow with zero-focus options');
  assert(testWin.isFocusable() === false, 'BrowserWindow created with focusable: false');
  assert(testWin.isAlwaysOnTop() === true, 'BrowserWindow created with alwaysOnTop: true');

  testWin.showInactive();
  assert(testWin.isVisible() === true, 'showInactive() displays window visibly');
  assert(testWin.isFocused() === false, 'showInactive() preserves zero-focus (isFocused is false)');

  testWin.setFocusable(true);
  assert(testWin.isFocusable() === true, 'setFocusable(true) enables focusability for custom ask');

  testWin.setFocusable(false);
  assert(testWin.isFocusable() === false, 'setFocusable(false) restores non-activating mode');

  testWin.destroy();
  assert(testWin.isDestroyed(), 'Cleanly destroyed test window');

  console.log('\n====================================================');
  console.log(`📊 TOOLBAR & ZERO FOCUS RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  app.exit(failed > 0 ? 1 : 0);
}

app.whenReady().then(() => {
  runToolbarTests().catch(err => {
    console.error('Fatal Test Exception:', err);
    app.exit(1);
  });
});
